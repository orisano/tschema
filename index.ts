import * as ts from "typescript";
import { JSONSchema7 } from "json-schema";

const testfile = "testdata/simple.ts";

const program = ts.createProgram({
  rootNames: [testfile],
  options: {
    noEmit: true
  }
});

const typeChecker = program.getTypeChecker();

function visit(n: ts.Node, tc: ts.TypeChecker) {
  if (ts.isTypeAliasDeclaration(n)) {
    console.log(JSON.stringify(getTypeDefinition(n.type), null, "  "));
  } else {
    n.forEachChild(node => visit(node, tc));
  }
}

function getTypeDefinition(t: ts.TypeNode): JSONSchema7 {
  switch (t.kind) {
    case ts.SyntaxKind.StringKeyword:
      return { type: "string" };
    case ts.SyntaxKind.NumberKeyword:
      return { type: "number" };
  }
  if (ts.isTypeLiteralNode(t)) {
    const signatures = t.members.filter(ts.isPropertySignature);
    const properties = signatures.reduce(
      (acc, x) => {
        return {
          ...acc,
          [x.name.getText()]: getTypeDefinition(x.type)
        };
      },
      {} as {
        [key: string]: JSONSchema7;
      }
    );
    const required = signatures
      .filter(s => s.questionToken == null)
      .map(s => s.name.getText());
    return {
      type: "object",
      properties,
      required
    };
  }
  if (ts.isArrayTypeNode(t)) {
    return {
      type: "array",
      items: getTypeDefinition(t.elementType)
    };
  }
  if (ts.isTypeReferenceNode(t)) {
    switch (t.typeName.getText()) {
      case "Array":
        return {
          type: "array",
          items: getTypeDefinition(t.typeArguments[0])
        };
      case "Partial":
        const partialDef = getTypeDefinition(t.typeArguments[0]);
        delete partialDef.required;
        return partialDef;
      case "Required":
        const requiredDef = getTypeDefinition(t.typeArguments[0]);
        requiredDef.required = Object.keys(requiredDef.properties);
        return requiredDef;
      case "Readonly":
        return getTypeDefinition(t.typeArguments[0]);
      case "Pick":
        const pickDef = getTypeDefinition(t.typeArguments[0]);
        const pickKeys = getTypeDefinition(t.typeArguments[1]);
        return pickProperties(pickDef, pickKeys.enum as string[]);
      case "Record":
        const recordKeys = getTypeDefinition(t.typeArguments[0])
          .enum as string[];
        const recordType = getTypeDefinition(t.typeArguments[1]);
        const properties = {};
        recordKeys.forEach(k => {
          properties[k] = {
            ...recordType
          };
        });
        return {
          type: "object",
          properties,
          required: recordKeys
        };
      case "Exclude":
        return getTypeDefinition(t.typeArguments[0]);
      case "Extract":
        return getTypeDefinition(t.typeArguments[1]);
      case "Omit":
        const omitDef = getTypeDefinition(t.typeArguments[0]);
        const omitKeys = getTypeDefinition(t.typeArguments[1]);
        return dropProperties(omitDef, omitKeys.enum as string[]);
    }
  }
  if (ts.isLiteralTypeNode(t)) {
    if (ts.isStringLiteral(t.literal)) {
      return {
        enum: [t.literal.text]
      };
    }
    if (ts.isNumericLiteral(t.literal)) {
      return {
        enum: [+t.literal.text]
      };
    }
  }
  if (ts.isUnionTypeNode(t)) {
    const literals = t.types.filter(ts.isLiteralTypeNode).map(l => l.literal);
    if (literals.length === t.types.length) {
      const strings = literals.filter(ts.isStringLiteral);
      if (literals.length === strings.length) {
        return {
          enum: strings.map(s => s.text)
        };
      }
      const numbers = literals.filter(ts.isNumericLiteral);
      if (literals.length === numbers.length) {
        return {
          enum: numbers.map(n => +n.text)
        };
      }
    }
    return {
      oneOf: t.types.map(getTypeDefinition)
    };
  }
  if (ts.isIntersectionTypeNode(t)) {
    return {
      allOf: t.types.map(getTypeDefinition)
    };
  }
  if (ts.isTypeOperatorNode(t)) {
    switch (t.operator) {
      case ts.SyntaxKind.KeyOfKeyword:
        const arg = getTypeDefinition(t.type);
        return {
          enum: Object.keys(arg.properties)
        };
    }
  }
}

visit(program.getSourceFile(testfile), typeChecker);

function pickProperties(def: JSONSchema7, keys: string[]): JSONSchema7 {
  if (def.type === "object") {
    const properties = {};
    keys.forEach(p => {
      properties[p] = def.properties[p];
    });
    return {
      ...def,
      properties,
      required: def.required.filter(x => keys.includes(x))
    };
  }
  if (def.allOf) {
    return {
      ...def,
      allOf: def.allOf.map(x => pickProperties(x as JSONSchema7, keys))
    };
  }
  if (def.oneOf) {
    return {
      ...def,
      allOf: def.oneOf.map(x => pickProperties(x as JSONSchema7, keys))
    };
  }
  if (def.anyOf) {
    return {
      ...def,
      allOf: def.anyOf.map(x => pickProperties(x as JSONSchema7, keys))
    };
  }
}

function dropProperties(def: JSONSchema7, keys: string[]): JSONSchema7 {
  if (def.type === "object") {
    keys.forEach(p => {
      delete def.properties[p];
    });
    return {
      ...def,
      required: def.required.filter(x => !keys.includes(x))
    };
  }
  if (def.allOf) {
    return {
      ...def,
      allOf: def.allOf.map(x => dropProperties(x as JSONSchema7, keys))
    };
  }
  if (def.oneOf) {
    return {
      ...def,
      allOf: def.oneOf.map(x => dropProperties(x as JSONSchema7, keys))
    };
  }
  if (def.anyOf) {
    return {
      ...def,
      allOf: def.anyOf.map(x => dropProperties(x as JSONSchema7, keys))
    };
  }
}
