// UI components が compiler.compile() で正常にコンパイルできることを確認
import { compile } from '@constela/compiler';
import { components, styles } from '../index';

describe('compiler compatibility', () => {
  it('should compile UI components without errors', () => {
    const program = {
      version: '1.0',
      state: { data: { type: 'list', initial: [] } },
      actions: [],
      view: { kind: 'component', name: 'Button', props: {} },
      components,
      styles
    };
    const result = compile(program);
    if (!result.ok) {
      console.log('Compile errors:', JSON.stringify(result.errors, null, 2));
    }
    expect(result.ok).toBe(true);
  });
});
