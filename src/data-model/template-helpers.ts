import {Attribute, SchemaDefinition} from "./schema-def";
import {classify} from "@angular-devkit/core/src/utils/strings";
import {LoggerApi} from "@angular-devkit/core/src/logger";
import {SchematicsException} from "@angular-devkit/schematics";

interface packageImports { n: string, from: string}

export interface TemplateSchemaDefinition {
    sd : SchemaDefinition;

    // Direct attributes.
    da : Attribute[];

    // all attributes
    aa : Attribute[];

    // struct attributes
    sa: Attribute[];

    // package imports for references outside the model
    im: packageImports[];

    // attributes with the flag isSearchable...
    qa: Attribute[];

    // attributes with the flag isDetail...
    deta: Attribute[];
}

export function newTemplateSchemaDefinition (_logger: LoggerApi, sd: SchemaDefinition) : TemplateSchemaDefinition {

    let da : Attribute[] = [];
    for(let a of sd.attributes)
        da.push(a);

    let aa = sd.collectAttributes(_logger);

    let sa : Attribute[] = [];
    let qa : Attribute[] = [];
    let deta : Attribute[] = [];
    let imports : packageImports[] = [];
    for(let a of aa) {
        switch(a.type) {

            case "array":
                if (a.item && a.item.type == 'struct')
                    sa.push(a.item);
                break;
            case "map":
                if (a.item && a.item.type == 'struct')
                    sa.push(a.item);
                break;
            case "struct":
                sa.push(a);
                break;
            case "string":
            case "int":
            case "long":
            case "bool":
            case "date":
            case "object-id":
                if (a.options) {
                    // _logger.error(`options of ${a.name}: ${a.options.isSearchable} ${a.options.isDetail}`);
                    if (a.options.isSearchable)
                       qa.push(a);
                    if (a.options.isDetail)
                        deta.push(a);
                }
                break;
            case "ref-struct":
                // No need to put in the sa list but need to resolve the imports.
                if (a.structRef.isExternal) {
                    imports.push({ n: a.structRef.structName, from: a.structRef.package })
                }
                break;
            default:
                _logger.error(`Type ${a.type} not intercepted for attribute ${a.name}`);
                throw new SchematicsException();
        }
    }

    return { sd: sd, da: da, aa: aa, sa: sa, im: imports, qa: qa, deta: deta };
}

export function tsPropertyName(a: Attribute) : string {
    return a.name;
}

export function tsPropertyType(a: Attribute) : string {

    let tst : string = 'undefined';
    switch(a.type) {
        case "array":
            tst = tsPropertyType(a.item) + "[]";
            break;
        case "map":
            break;
        case "struct":
            tst = classify(a.structName)
            break;
        case "string":
            tst = 'string';
            break;
        case "int":
            break;
        case "long":
            break;
        case "bool":
            tst = 'boolean';
            break;
        case "date":
            tst = 'number';
            break;
        case "object-id":
            break;
        case "ref-struct":
            tst = a.structRef.structName;
            break;
    }

    return tst;
}

