import {
  apply,
  chain,
  MergeStrategy,
  mergeWith,
  move,
  Rule,
  SchematicContext,
  template,
  Tree, url
} from '@angular-devkit/schematics';
import {NewSchemaDefinition} from "../data-model/schema-def-factory";
import {getLocation, getWorkspacePathInfo} from "../shared/util/location";
import {join, strings, Path} from "@angular-devkit/core";
import {dasherize} from "@angular-devkit/core/src/utils/strings";
import * as patch from "../shared/util/patch";
import * as tmplHelpers from "../data-model/template-helpers";
import {Dependency, FindDependency, ParseDependencies} from "../shared/util/dependencies";
import {SchemaDefinition} from "../data-model/schema-def";
import {AcceptAllButPredicate, filterAndRenameTemplates} from "../shared/rules/filter-files";
import {newTemplateSchemaDefinition} from "../data-model/template-helpers";
import {handleConflicts} from "../shared/rules/handle-conflict";

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function types(_options: TypesSchema): Rule {
  // The function has been marked async to be able to use the await call on getWorkspace
  // to do that need to return a function instead of the straight object....
  return async (tree: Tree, _context: SchematicContext) => {

    _context.logger.info("R3DS9 schematics.");
    _context.logger.info("types2 schematic");
    _context.logger.debug("Opts: " + JSON.stringify(_options));

    /* Save the options that get modified in the process. The originals are put in the shell script to replicate the command */
    _options.argv_0 = _options.name;

    // Basically it works by reading the file and parsing the JSON, Then it gets through visiting the parsed json and populating the various structures.
    let sd = NewSchemaDefinition(_context, _options.dmFileDefinition || '');
    _context.logger.debug('Schema definition' +  JSON.stringify(sd));

    let workspacePathInfo =  "src/app"
    let skipWorkspace = true
    if (!skipWorkspace) {
      workspacePathInfo = await getWorkspacePathInfo(_context, tree,  _options.project);
    }

    const fileLocation = getLocation(_context, workspacePathInfo, _options.path as Path, _options.name);
    _options.name = dasherize(fileLocation.name);
    _options.argv_path = fileLocation.path;
    _options.path = fileLocation.path || '';
    if (!_options.flat) {
      _options.path = join(_options.path as Path, _options.name);
    }

    _context.logger.info(`\u001B[36mComponent-name\u001B[0m: ${_options.name}`);
    _context.logger.info(`\u001B[36mComponent-location\u001B[0m: ${fileLocation.path}`);
    _context.logger.info(`\u001B[36mFlat-policy\u001B[0m: ${_options.flat}`);
    _context.logger.info(`\u001B[36mComponent-location [Actual]\u001B[0m: ${_options.path}`);

    let deps = ParseDependencies(_context.logger, _options.path,_options.dependencies || '');

    if (patch.exist(tree, _context, _options.path)) {
      _context.logger.error(`conflicts exist from a previous run. please clear or resolve them before re-trying!`);
      return (tree: Tree) => tree;
    }

    return chain([createTypes(sd, _options, deps)]);
  };
}

function createTypes(sd: SchemaDefinition, _options: TypesSchema, _deps: Dependency[]): Rule {
  return (_currentTree: Tree, _context: SchematicContext) => {

    const sourceTemplates = url('./files/templates');
    const processedTemplates = apply(sourceTemplates, [

      /* Handle the template extension and use the variants template for the specific case
       * basically a new tree is built out of the provided templates. a for-each skip the templates which generates stuff not to be generated.
       * The _currentTree is in closure scope but is no use in this context.
       */
      filterAndRenameTemplates(_currentTree, _context, AcceptAllButPredicate(_context, _options.skipFileTypes)),

      /*
       * Templates are evaluated and file generated. They are generated in the root of the new tree
       */
      template({
        tmplSd: newTemplateSchemaDefinition(_context.logger, sd),
        ..._options,
        ...strings,
        ...tmplHelpers,
        deps: _deps,
        findDependency: FindDependency,
      }),

      /*
       * Generated artifacts are moved from the root to the target path
       */
      move(_options.path),

      /*
       * Current tree is checked to see if there are conflicts. In case the conflicts are handled by deleting or creating new renamed files.
       */
      handleConflicts(_currentTree, _context, _options)
    ]);

    /*
     * After this chain a merge strategy with OVERWRITE is used.
     */
    return chain([
      /* Issue..... apparently the call to externalSchematics of component doesn't allow to specify the force flag..
      externalSchematic('@schematics/angular', 'component',
          { name: _options.name, path: _options.path, flat: _options.flat, project: _options.project }), */
      mergeWith(processedTemplates, MergeStrategy.Overwrite),
    ]);
  }
}
