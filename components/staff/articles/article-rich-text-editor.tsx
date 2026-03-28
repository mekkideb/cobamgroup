"use client";

import { useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  parseArticleContent,
  serializeArticleContent,
} from "@/features/articles/document";
import { createArticleEditorExtensions } from "@/features/articles/editor/extensions";
import { cn } from "@/lib/utils";
import ArticleRichTextToolbar from "./article-rich-text-toolbar";

type ArticleRichTextEditorProps = {
  editorId?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
};

export default function ArticleRichTextEditor({
  editorId,
  value,
  onChange,
  placeholder = "Commencez a ecrire votre article...",
  editable = true,
  className,
}: ArticleRichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  const document = useMemo(() => parseArticleContent(value), [value]);
  const normalizedValue = useMemo(
    () => serializeArticleContent(document),
    [document],
  );
  const extensions = useMemo(
    () => createArticleEditorExtensions({ placeholder }),
    [placeholder],
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: document,
    editable,
    editorProps: {
      attributes: {
        ...(editorId ? { id: editorId } : {}),
        class: "tiptap article-document article-document--editor",
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChangeRef.current(serializeArticleContent(nextEditor.getJSON()));
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(editable);

    const currentContent = serializeArticleContent(editor.getJSON());

    if (currentContent !== normalizedValue) {
      editor.commands.setContent(document, { emitUpdate: false });
    }
  }, [document, editable, editor, normalizedValue]);

  return (
    <div
      className={cn(
        "border border-slate-200 bg-white shadow-sm",
        !editable && "opacity-90",
        className,
      )}
    >
      <ArticleRichTextToolbar editor={editor} />

      <div className="overflow-hidden rounded-b-[28px] bg-white">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="article-document article-document--editor animate-pulse">
            Chargement de l&apos;editeur...
          </div>
        )}
      </div>
    </div>
  );
}
