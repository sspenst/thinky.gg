import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import React from 'react';

type LexicalEditorProps = {
  config: Parameters<typeof LexicalComposer>['0']['initialConfig'];
};

export function LexicalEditor(props: LexicalEditorProps) {
  return (
    <LexicalComposer initialConfig={props.config}>

      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<Placeholder />}
        ErrorBoundary={LexicalErrorBoundary}
      />
    </LexicalComposer>
  );
}

const Placeholder = () => {
  return (
    <div className='absolute top-[1.125rem] left-[1.125rem] opacity-50'>
      Start writing...
    </div>
  );
};

export function RichInput() {
  return (
    <div
      id='editor-wrapper'
      className={
        'relative prose prose-slate prose-p:my-0 prose-headings:mb-4 prose-headings:mt-2'
      }
    >
      <LexicalEditor
        config={{
          namespace: 'lexical-editor',
          theme: {
            root: 'p-4 border-slate-500 border-2 rounded h-full min-h-[200px] focus:outline-none focus-visible:border-black',
            link: 'cursor-pointer',
            text: {
              bold: 'font-semibold',
              underline: 'underline',
              italic: 'italic',
              strikethrough: 'line-through',
              underlineStrikethrough: 'underlined-line-through',
            },
          },
          onError: error => {
            console.log(error);
          },
        }}
      />
    </div>
  );
}
