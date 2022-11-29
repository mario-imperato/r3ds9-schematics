import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';

const collectionPath = path.join(__dirname, '../collection.json');

describe('types', () => {
  it('works', async () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = await runner
      .runSchematicAsync('types', {
        name: 'site',
        dmFileDefinition: 'src/types/files/examples/example-site.json',
        dependencies: 'pippo:/src/app/shared/schematics',
        onConflict: 'OVERWRITE'
      }, Tree.empty())
      .toPromise();

    expect(tree.files).toEqual([]);
  });
});
