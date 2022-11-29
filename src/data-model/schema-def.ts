import {AttributeType, Err} from "./types";
import {classify} from "@angular-devkit/core/src/utils/strings";
import {LoggerApi} from "@angular-devkit/core/src/logger";

export interface Serializable<T> {
    deserialize(_logger: LoggerApi, input: any): T;
    // deserializeGridLayout(_logger: LoggerApi, input: any, mode: SerializationForm): T;
}

export type SchemaVisitorFn = (a: Attribute) => boolean;

export interface SchemaVisitor {
    startVisit: SchemaVisitorFn,
    visit: SchemaVisitorFn,
    endVisit: SchemaVisitorFn,
}

export interface StructRef {
    structName: string;
    isExternal: boolean;
    package: string;
    item?: Attribute;
}

export interface AttributeMap {
    [key: string]: Attribute;
}

export class AttributeOptions  implements Serializable<AttributeOptions>{
    isSearchable: boolean;
    isDetail: boolean;

    deserialize(_logger: LoggerApi, _input: any): AttributeOptions {

        if (!_input)
        {
            _logger.error("cannot deserialize AttributeOptions for null input");
        }

        // _logger.error("input options: " + JSON.stringify(_input));
        this.isSearchable = _input.isSearchable || false;
        this.isDetail = _input.isDetail || false;
        return this;
    }
}

export class Attribute implements Serializable<Attribute> {
    name: string;
    type: AttributeType;
    isKey: boolean;
    structName: string;
    attributes: Attribute[];
    structRef: StructRef;
    item: Attribute;
    options: AttributeOptions;

    get isStructType(): boolean {
        return this.type == "struct" || this.type == "ref-struct";
    }

    get isCollectionType(): boolean {
        return this.type == "map" || this.type == "array";
    }

    get isValueType(): boolean {
        return !this.isStructType && !this.isCollectionType;
    }

    deserialize(_logger: LoggerApi, _input: any): Attribute {

        this.name = _input.name;
        this.type = _input.type;
        this.isKey = _input.isKey || false;
        this.structName = _input.structName;
        this.options = _input.options;

        if (_input.structRef) {
            this.structRef = {
                structName: _input.structRef.structName,
                isExternal: _input.structRef.isExternal || false,
                package: _input.structRef.package,
            }
        }

        if (_input.attributes) {
            this.attributes = _input.attributes.map((item: any) => {
                return new Attribute().deserialize(_logger, item);
            });
        }

        if (_input.options)
            this.options = new AttributeOptions().deserialize(_logger, _input.options);

        if (_input.item) {
            this.item = new Attribute().deserialize(_logger, _input.item);
        }

        return this;
    }

    visit(_logger: LoggerApi, v: Partial<SchemaVisitor>) {
        if (v.startVisit)
            v.startVisit(this);

        // Se il riferimento e' esterno allora non lo 'seguo'. L'elemento e' nil.
        if (this.type == "ref-struct") {
            if (this.structRef.item && this.structRef.item.attributes) {
                for (let a of this.structRef.item.attributes) {
                    if (v.visit) {
                        v.visit(a);
                    }
                    a.visit(_logger, v);
                }
            }
        } else {
            if (this.attributes) {
            for (let a of this.attributes) {
                if (v.visit)
                    v.visit(a);

                a.visit(_logger, v);
            }
            }

            if (this.item) {
                this.item.visit(_logger, v);
            }
        }

        if (v.endVisit)
            v.endVisit(this);
    }


    validate(_logger: LoggerApi, pPath: string, parent?: Attribute): Err {

        let arrayItemDefinition = false;

        if (parent && (parent.type == "array" || parent.type == "map"))
            arrayItemDefinition = true

        if (!arrayItemDefinition) {
            _logger.debug(`[${pPath}] start validating field ${this.name}`);
        } else {
            _logger.debug(`[${pPath}] start validating array item`);
        }

        if (!arrayItemDefinition && !fieldNameWellFormed(this.name)) {
            return [true, `[${pPath}] field name is not well formed `];
        }

        if (arrayItemDefinition) {
            if (this.name && this.name.length != 0 && this.name != "[]" && this.name != "%s") {
                return [true, `[${pPath}] field name is provided but is not required`];
            }
        } else {
            pPath = pPath + "." + this.name;
        }

        switch (this.type) {
            case "object-id":
            case "string":
            case "int":
            case "long":
            case "bool":
            case "date":
                break;
            case "ref-struct":
                let sn = this.structRef && this.structRef.structName;
                if (!sn || sn.length == 0) {
                    sn = this.structName;
                    if (!this.structRef)
                        this.structRef = {
                            isExternal: false,
                            structName: "",
                            package: "",
                        };
                    this.structRef.structName = sn;
                }
                if (!sn || sn.length == 0) {
                    return [true, `[${pPath}] struct name required for ${this.type}`];
                }

                if (this.structRef.isExternal && (!this.structRef.package || this.structRef.package == "")) {
                    return [true, `[${pPath}] struct reference declared external but missing package info  ${this.structRef.structName}`];
                }
                break;
            case "struct":
                if (this.isKey) {
                    return [true, `[${pPath}] is-key not supported on  ${this.isKey}`];
                } else {
                    for (let a1 of this.attributes) {
                        let rca = a1.validate(_logger, pPath, this);
                        if (rca[0]) {
                            return [true, rca[1]];
                        }
                    }
                }

                if (!this.structName || this.structName.length == 0) {
                    if (arrayItemDefinition) {
                        this.structName = classify(parent!.name + "Struct");
                    } else {
                        this.structName = classify(this.name + "Struct");
                    }
                    _logger.debug(`[${pPath}] no name provided for struct name...using ${this.structName}`);
                }
                break;
            case "map":
            case "array":
                if (this.isKey) {
                    return [true, `[${pPath}] is-key not supported on  ${this.isKey}`];
                } else {
                    if (!this.item)
                        return [true, `[${pPath}] no item provided for collection type`];
                    return this.item.validateItem(_logger, pPath, this);
                }
                // break;

            default:
                return [true, `[${pPath}] case default?  ${this.type}`];
        }

        return [false, ""];
    }

    validateItem(_logger: LoggerApi, pPath: string, parent: Attribute): [boolean, string] {

        _logger.debug(`start validating array item definition with path: ${pPath}`);

        /*
         * The item gets assigned a special name as field. Sort of indexer.
         */
        if (parent.type == "array") {
            this.name = "[]";
            pPath = pPath + ".[i]";
        } else {
            this.name = "%s";
            pPath = pPath + "%s";
        }

        return this.validate(_logger, pPath, parent);
    }

}

export interface Properties {
    folderPath?: string;
    structName?: string;
}

export class SchemaDefinition implements Serializable<SchemaDefinition> {

    name: string;
    sourceFile: string = "";
    properties: Properties;
    attributes: Attribute[] = [];

    constructor() {

    }

    deserialize(_logger: LoggerApi, _input: any): SchemaDefinition {

        this.name = _input.name;
        if (_input.properties) {
            this.properties = {
                folderPath: _input.properties.folderPath,
                structName: _input.properties.structName,
            }
        }

        this.attributes = _input.attributes.map((item: any) => {
            return new Attribute().deserialize(_logger, item);
        });


        return this;
    }

    validate(_logger: LoggerApi): Err {

        _logger.debug(`start validating collection definition ${this.name}`);
        let pPath = (this.name) ? this.name.trim() : "";
        if (!pPath || pPath.length == 0)
            pPath = "<undefined>";

        if (!this.attributes || this.attributes.length == 0)
            return [true, `[${pPath}]: attributes missing from schema`];

        for (let a of this.attributes) {
            let rca = a.validate(_logger, pPath);
            if (rca[0]) {
                return [true, rca[1]];
            }
        }

        return [false, ""];
    }

    collectAttributes(_logger: LoggerApi) : Attribute[] {

        let attrCollector : { attrs: Attribute[], visit(_a: Attribute) : boolean} = {
            attrs: [],
            visit(_a: Attribute) : boolean {
                this.attrs.push(_a);
                return true;
            }
        }

        for(let a of this.attributes) {
            attrCollector.visit(a);
            a.visit(_logger, attrCollector);
        }

        _logger.debug(`number of attributes ${attrCollector.attrs.length}`)
        return attrCollector.attrs;
    }

    wireReference2Structs(_logger: LoggerApi, fields: Attribute[]): Err {

        let refs: AttributeMap = {};
        for (let a of fields) {
            if (a.type == 'struct')
                refs[a.structName] = a;
            else if ((a.type == 'map' || a.type == 'array') && a.item.type == 'struct') {
                refs[a.item.structName] = a.item;
            }
        }

        for (let a of fields) {
            if (a.type == 'ref-struct') {
                if (refs[a.structRef.structName]) {
                    a.structRef.item = refs[a.structRef.structName];
                } else {
                    if (!a.structRef.isExternal) {
                        return [true, `the field ${a.name} refers to undefined struct %s", f.Name, ${a.structRef.structName}`];
                    }
                }
            }
        }

        return [false, ''];
    }

}


function fieldNameWellFormed(_n: string): boolean {
    return true;
}
