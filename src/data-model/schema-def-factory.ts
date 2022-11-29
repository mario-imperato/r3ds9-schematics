
import * as fs from "fs";
import {SchematicContext, SchematicsException} from "@angular-devkit/schematics";
import {SchemaDefinition} from "./schema-def";
import {camelize} from "@angular-devkit/core/src/utils/strings";

export function NewSchemaDefinition(_context: SchematicContext, jsonFileName: string): SchemaDefinition {
    try {
        let jsonData = JSON.parse(fs.readFileSync(jsonFileName, 'utf8'), camelizeJsonProperty);
        let fd: SchemaDefinition = new SchemaDefinition().deserialize(_context.logger,  jsonData);
        fd.sourceFile = jsonFileName;

        let err = fd.validate(_context.logger);
        if (err[0])
            throw new SchematicsException(err[1]);

        let attrs = fd.collectAttributes(_context.logger);
        for(let a of attrs) {
            _context.logger.debug(`Attr: ${a.name}`);
        }

        err = fd.wireReference2Structs(_context.logger, attrs);
        if (err[0]) {
            _context.logger.error(`Err: ${err[1]}`);
        }

        return fd;

    } catch (exc) {
        _context.logger.error('Schema error: ' + exc.message);
        throw new SchematicsException(`Error processing file ${jsonFileName}`);
    }
}

function camelizeJsonProperty(this: any, key: string, value: any) : any {

    if (key.indexOf("-") >= 0) {
        let camelizedKey = camelize(key);
        this[camelizedKey] = value;
        return ;
    }

    return value;
}
