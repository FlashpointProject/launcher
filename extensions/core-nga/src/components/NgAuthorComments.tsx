import { GameComponentProps } from 'flashpoint-launcher-renderer';
import { compileSync, runSync } from '@mdx-js/mdx';
import { ExtData } from './types';
import * as runtime from 'react/jsx-runtime';
import { ErrorBoundary } from 'react-error-boundary';
import { Plugin } from 'unified';
import { Node } from 'unist';
import { visit } from 'unist-util-visit';
import { MdxJsxTextElement } from 'mdast-util-mdx-jsx';

export default function NgAuthorComments(props: GameComponentProps) {
  const extData: ExtData | undefined = props.game.extData?.nga;
  const comments = extData?.author_comments;

  let content: any = undefined;
  if (comments) {
    const baseUrl = 'https://newgrounds.com';
    const code = String(compileSync(comments, {
      outputFormat: 'function-body',
      rehypePlugins: [rehypeTargetBlank]
    }));
    const { default: MDXContent } = runSync(code, { ...runtime, baseUrl });
    content = <ErrorBoundary fallbackRender={({ error }) => <>{`Error rendering author comments: ${error}`}</>}>
      <MDXContent />
    </ErrorBoundary>;
  } else {
    content = <p>No Author Comments</p>;
  }

  return (
    <div className='browse-right-sidebar__row'>
      <p>NG Author Comments:</p>
      <div className='ng-author-comments'>
        {content}
      </div>
    </div>
  );
}

const rehypeTargetBlank: Plugin = () => {
  return (tree: Node) => {
    visit(tree, 'mdxJsxTextElement', (node: MdxJsxTextElement) => {
      if (node.name === 'a') {
        // Find href attr
        const hrefAttr = node.attributes.find(a => a.type === 'mdxJsxAttribute' && a.name === 'href');
        if (hrefAttr) {
          node.attributes = [
            hrefAttr,
            { type: 'mdxJsxAttribute', name: 'target', value:'_blank' },
            { type: 'mdxJsxAttribute', name: 'rel', value: 'noopener noreferrer' }
          ];
        }
      }
    });
  };
};
