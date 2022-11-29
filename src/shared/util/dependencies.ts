import * as path from "path";
import {LoggerApi} from "@angular-devkit/core/src/logger";

export interface Dependency
    {
        context: string,
        path: string,
        name?: string,
    }

export function ParseDependencies(_logger: LoggerApi, aPath: string, deps: string) : Dependency[] {
   let r : Dependency[] = [];

   if (deps && deps.length > 0) {
       let depSegments = deps.split(";");
       for (let s of depSegments) {
           let segSplit = s.split(":");
           let context = segSplit[0];
           let p = segSplit[1];
           let  name : string | undefined = undefined;
           let ndx = p.indexOf("#");
           if (ndx >= 0) {
               name = p.substr(ndx + 1);
               p = p.substring(0, ndx);
           }

           let rp = path.relative(aPath, p);
           _logger.debug(`Setting relative path to imports to ${rp} by comparing target ${aPath} and config ${p} `);

           r.push({ context: context, path: rp, name: name });
       }
   }
   return r;
}

export function FindDependency(ctx: string, deps: Dependency[]) : Dependency | undefined {

    // not a proper log..... i would need to pass the template the logger....
    // console.log(`finding: ${ctx} in ${JSON.stringify(deps)} `);
    for(let d of deps) {
        if (d.context == ctx) {
            return d;
        }
    }

    return undefined;
}
