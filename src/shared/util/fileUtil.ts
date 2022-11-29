import {SchematicContext} from "@angular-devkit/schematics";
import {extname, Path} from "@angular-devkit/core";

export function isExtensionInList(_context: SchematicContext, ext: string, listOfExtensions: string | undefined) : boolean {
    if (!listOfExtensions)
        return false;

    let listOfExt = listOfExtensions.split(",");
    _context.logger.debug(`testing extension ${ext} against ${listOfExtensions}`);
    for(let e of listOfExt) {
        e = e.trim();
        if (e.startsWith(".") && e == ext)
            return true;
    }

    return false;
}

export function isSuffixInList(_context: SchematicContext, path: string, listOfSuffixes: string | undefined, pathExtOnly : boolean = true) : boolean {
    if (!listOfSuffixes)
        return false;

    let listOfExt = listOfSuffixes.split(",");
    _context.logger.debug(`testing extension ${path} against ${listOfSuffixes}`);

    let p = path;

    // Strip the .template extension
    if (p.endsWith(".template"))
       p = path.substr(0, path.length - ".template".length);

    // Consider only the extension and not the full path.
    if (pathExtOnly) {
        p = extname(p as Path);
    }

    for(let e of listOfExt) {
        e = e.trim();
        if (pathExtOnly) {
            if (p == e)
                return true;
        } else {
           if (p.endsWith(e))
                return true;
        }
    }

    return false;
}
