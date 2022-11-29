import {SchematicContext, SchematicsException, Tree} from "@angular-devkit/schematics";
import {buildDefaultPath, getWorkspace} from "@schematics/angular/utility/workspace";
import {join, Path} from "@angular-devkit/core";
import {Location, parseName} from "@schematics/angular/utility/parse-name";

export function getLocation(_context: SchematicContext, workspacePathInfo: string, _aPath: Path, aName: string): Location {

    _context.logger.debug(`::getLocation - workspace-path=${workspacePathInfo}, path: ${_aPath}, name: ${aName}`);
    aName = formWs(_context, workspacePathInfo, _aPath, aName);

    const parsedPath = parseName(workspacePathInfo, aName);
    _context.logger.debug("::getLocation parsed path " + JSON.stringify(parsedPath));

    return parsedPath;
}

export async function getWorkspacePathInfo(_context: SchematicContext, tree : Tree, aProject: string = ''): Promise<string> {

    const workspace =  await getWorkspace(tree);

    let theProject = aProject || '';
    if (!theProject) {
        theProject = workspace.projects.keys().next().value;
        _context.logger.debug("::getWorkspacePathInfo target-project: " + theProject)
    }
    const project = workspace.projects.get(theProject);
    if (!project) {
        throw new SchematicsException(`::getWorkspacePathInfo - invalid project name: ${theProject}`);
    }

    const defaultProjectPath = buildDefaultPath(project);
    _context.logger.debug('::getWorkspacePathInfo - defaultProjectPath: ' + defaultProjectPath);

    return defaultProjectPath
}

function formWs(_context: SchematicContext, pp: string, p: string, n: string) : string {

    // Process dot notation.
    if (n.startsWith("./") || n == ".") {

        let np = parseOptionsPath(_context, pp, p);
        // Path now should be the path with the common part with the defaultPp removed...
        _context.logger.debug(`Path processing ${pp} ${p} --> [${np}]`);

        if (!np[0])
            throw new SchematicsException(`Dot notation cannot be used when path ${p} is outside default project path ${pp}`);

       // if (!np[0] || np[1]=="" || np[1] == "/")
       //     throw new SchematicsException(`Dot notation cannot be used when path ${p} is outside default project path ${pp}`);

        let jn = join(np[1] as Path, n);
        _context.logger.debug(`Joined path ${np[1]} + ${n} --> [${jn}]`);
        if (jn == "") {
            throw new SchematicsException(`Path ${p} not compatible with ${n} parameter... dotted path cannot be resolved`);
        }
        n = jn;
    } else if (n.startsWith(pp)) {
        // handle the typical case of src/app/...
        n = n.substring(pp.length);
    } else if (n.startsWith("/" + pp)) {
        // handle the typical case of /src/app/...
        n = n.substring(pp.length + 1);
    }

    _context.logger.debug(`::formWs - Returned name is: [${n}]`);
    return n;
}

function parseOptionsPath(_context: SchematicContext, pp: string, p: string) : [boolean, string] {

    // Note: put a root slash. Noticed that in the current incarnation the pp (that is the project path has values without the leading slash (i.e. src/app).
    // The logic was to add a slash so I went to adding one if there is not. Introduced the new vars to avoid confusion.
    let np = (!p) ? "/" : "/" + p;
    let npp = (pp.charAt(0) == '/') ? pp :  "/" + pp;

    let npp_split = npp.split("/");
    let np_split = np.split("/");
    _context.logger.debug(`::parseOptionsPath - np: ${np} [${np_split}], pp: ${npp} [${npp_split}]`);
    if (np_split.length >= npp_split.length)
    {
        if (np.startsWith(npp)) {
            np = np.substring(npp.length);
        } else {
            return [false, ""];
        }
    } else {
        if (npp.startsWith(np)) {
            np = "/";
        } else {
            return [false, ""];
        }
    }

    return [true, np];
}

/*
function formWs(_context: SchematicContext, defaultPp: string, p: string, n: string) {

    if (n.startsWith("./") || n == ".") {
        if (!p || p == "" || p == defaultPp || (p + "/") == defaultPp) {
            _context.logger.debug("Incompatible params.... for " + n + " in " + p);
            return ;
        } else {
            let psegs = p.split("/");
            n = psegs[psegs.length-1];
            if (n == "")
            {
                n = psegs[psegs.length-2];
            }

        }
    }

    let nn = normalize(join(p as Path, n));
    _context.logger.debug("Rel Path to workspace root: " + relativePathToWorkspaceRoot(nn) + " for " + nn + " from " + n + " in " + p);

}
*/
