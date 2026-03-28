"use client";

import {
  ClipboardEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, X } from "lucide-react";
import { listTagSuggestionsClient } from "@/features/tags/client";
import type { TagSuggestionDto } from "@/features/tags/types";
import { cn } from "@/lib/utils";

function normalizeTagName(tagName: string) {
  return tagName.replace(/\s+/g, " ").trim();
}

function splitTagNames(input: string) {
  return input
    .split(/\s+/)
    .map((item) => normalizeTagName(item))
    .filter(Boolean);
}

function findLastTagIndex(tagNames: readonly string[], targetTag: string) {
  const normalizedTarget = normalizeTagName(targetTag).toLocaleLowerCase("fr-FR");

  for (let index = tagNames.length - 1; index >= 0; index -= 1) {
    if (
      normalizeTagName(tagNames[index]).toLocaleLowerCase("fr-FR") ===
      normalizedTarget
    ) {
      return index;
    }
  }

  return -1;
}

function dedupeTagNames(tagNames: readonly string[]) {
  const seen = new Set<string>();

  return tagNames.filter((tagName) => {
    const key = normalizeTagName(tagName).toLocaleLowerCase("fr-FR");

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function sortSuggestions(
  items: readonly TagSuggestionDto[],
  query: string,
): TagSuggestionDto[] {
  const normalizedQuery = query.toLocaleLowerCase("fr-FR");

  return [...items].sort((left, right) => {
    const leftName = left.name.toLocaleLowerCase("fr-FR");
    const rightName = right.name.toLocaleLowerCase("fr-FR");
    const leftStartsWith = leftName.startsWith(normalizedQuery);
    const rightStartsWith = rightName.startsWith(normalizedQuery);

    if (leftStartsWith !== rightStartsWith) {
      return leftStartsWith ? -1 : 1;
    }

    return leftName.localeCompare(rightName, "fr");
  });
}

export default function StaffTagInput({
  value,
  onChange,
  placeholder = "Tapez un tag puis espace",
  disabled = false,
  maxSuggestions = 8,
  className,
  id
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxSuggestions?: number;
  className?: string
  id?: string
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);

  const [inputValue, setInputValue] = useState("");
  const [insertionIndex, setInsertionIndex] = useState(value.length);
  const [suggestions, setSuggestions] = useState<TagSuggestionDto[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const activeInsertionIndex = Math.min(insertionIndex, value.length);

  useEffect(() => {
    const normalizedQuery = normalizeTagName(inputValue);

    if (!normalizedQuery) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const nextRequestId = requestIdRef.current + 1;
      requestIdRef.current = nextRequestId;
      setIsLoadingSuggestions(true);

      void listTagSuggestionsClient({
        q: normalizedQuery,
        limit: maxSuggestions,
      })
        .then((result) => {
          if (requestIdRef.current !== nextRequestId) {
            return;
          }

          const existingTagKeys = new Set(
            value.map((tagName) =>
              normalizeTagName(tagName).toLocaleLowerCase("fr-FR"),
            ),
          );

          const filteredSuggestions = sortSuggestions(
            result.items.filter(
              (item) =>
                !existingTagKeys.has(
                  normalizeTagName(item.name).toLocaleLowerCase("fr-FR"),
                ),
            ),
            normalizedQuery,
          );

          setSuggestions(filteredSuggestions);
          setHighlightedIndex(0);
        })
        .catch(() => {
          if (requestIdRef.current !== nextRequestId) {
            return;
          }

          setSuggestions([]);
          setHighlightedIndex(0);
        })
        .finally(() => {
          if (requestIdRef.current === nextRequestId) {
            setIsLoadingSuggestions(false);
          }
        });
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [inputValue, maxSuggestions, value]);

  const visibleSuggestions = useMemo(
    () => suggestions.slice(0, maxSuggestions),
    [maxSuggestions, suggestions],
  );

  const primarySuggestion = visibleSuggestions[0] ?? null;
  const normalizedInputValue = normalizeTagName(inputValue);
  const ghostSuffix =
    primarySuggestion &&
    normalizedInputValue &&
    primarySuggestion.name
      .toLocaleLowerCase("fr-FR")
      .startsWith(normalizedInputValue.toLocaleLowerCase("fr-FR")) &&
    primarySuggestion.name.length > normalizedInputValue.length
      ? primarySuggestion.name.slice(normalizedInputValue.length)
      : "";

  const commitTags = (nextValues: string[]) => {
    onChange(dedupeTagNames(nextValues));
  };

  const insertTags = (tagNames: readonly string[]) => {
    const normalizedTags = dedupeTagNames(tagNames);

    if (normalizedTags.length === 0) {
      setInputValue("");
      setSuggestions([]);
      setHighlightedIndex(0);
      return;
    }

    const nextValues = [...value];
    nextValues.splice(activeInsertionIndex, 0, ...normalizedTags);
    const dedupedValues = dedupeTagNames(nextValues);
    const lastInsertedTag =
      normalizedTags[normalizedTags.length - 1].toLocaleLowerCase("fr-FR");
    const nextInsertionIndex = findLastTagIndex(dedupedValues, lastInsertedTag) + 1;

    commitTags(dedupedValues);
    setInputValue("");
    setSuggestions([]);
    setHighlightedIndex(0);
    setInsertionIndex(Math.max(nextInsertionIndex, 0));
  };

  const handleInputChange = (nextValue: string) => {
    setInputValue(nextValue);

    if (!normalizeTagName(nextValue)) {
      setSuggestions([]);
      setHighlightedIndex(0);
      setIsLoadingSuggestions(false);
    }
  };

  const insertTag = (tagName: string) => {
    const normalizedTag = normalizeTagName(tagName);

    if (!normalizedTag) {
      setInputValue("");
      setSuggestions([]);
      setHighlightedIndex(0);
      return;
    }

    insertTags([normalizedTag]);
  };

  const removeTagAt = (index: number) => {
    const nextValues = value.filter((_, itemIndex) => itemIndex !== index);
    commitTags(nextValues);
    setInsertionIndex((current) => Math.min(current, nextValues.length));
    inputRef.current?.focus();
  };

  const applyHighlightedSuggestion = () => {
    const suggestion = visibleSuggestions[highlightedIndex] ?? primarySuggestion;

    if (!suggestion) {
      return false;
    }

    insertTag(suggestion.name);
    return true;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    const target = event.currentTarget;
    const cursorAtStart = target.selectionStart === 0 && target.selectionEnd === 0;
    const cursorAtEnd =
      target.selectionStart === target.value.length &&
      target.selectionEnd === target.value.length;

    if (event.key === "Tab" && visibleSuggestions.length > 0) {
      event.preventDefault();
      applyHighlightedSuggestion();
      return;
    }

    if (event.key === "ArrowDown" && visibleSuggestions.length > 0) {
      event.preventDefault();
      setHighlightedIndex((current) =>
        Math.min(current + 1, visibleSuggestions.length - 1),
      );
      return;
    }

    if (event.key === "ArrowUp" && visibleSuggestions.length > 0) {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      if (visibleSuggestions.length > 0) {
        event.preventDefault();
        applyHighlightedSuggestion();
        return;
      }

      if (normalizedInputValue) {
        event.preventDefault();
        insertTag(normalizedInputValue);
      }

      return;
    }

    if (event.key === " " && normalizedInputValue) {
      event.preventDefault();
      insertTag(normalizedInputValue);
      return;
    }

    if (event.key === "Backspace" && !inputValue && cursorAtStart) {
      if (activeInsertionIndex > 0) {
        event.preventDefault();
        removeTagAt(activeInsertionIndex - 1);
      }
      return;
    }

    if (event.key === "Delete" && !inputValue && cursorAtStart) {
      if (activeInsertionIndex < value.length) {
        event.preventDefault();
        removeTagAt(activeInsertionIndex);
      }
      return;
    }

    if (event.key === "ArrowLeft" && !inputValue && cursorAtStart) {
      event.preventDefault();
      setInsertionIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "ArrowRight" && !inputValue && cursorAtEnd) {
      event.preventDefault();
      setInsertionIndex((current) => Math.min(current + 1, value.length));
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    const pastedText = event.clipboardData.getData("text");

    if (!pastedText) {
      return;
    }

    const target = event.currentTarget;
    const selectionStart = target.selectionStart ?? inputValue.length;
    const selectionEnd = target.selectionEnd ?? inputValue.length;
    const combinedInput =
      inputValue.slice(0, selectionStart) +
      pastedText +
      inputValue.slice(selectionEnd);

    if (!/\s/.test(combinedInput)) {
      return;
    }

    event.preventDefault();
    insertTags(splitTagNames(combinedInput));
  };

  const showSuggestionMenu =
    isFocused && (isLoadingSuggestions || visibleSuggestions.length > 0);

  return (
    <div id={id} className="relative">
      <div
        className={cn(
          "flex min-h-12 flex-wrap items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2 transition-colors",
          disabled ? "cursor-not-allowed bg-slate-100/80 opacity-70" : "focus-within:border-cobam-water-blue",
          className
        )}
        onClick={() => {
          if (disabled) {
            return;
          }

          setInsertionIndex(value.length);
          inputRef.current?.focus();
        }}
      >
        {value.slice(0, activeInsertionIndex).map((tagName, index) => (
          <button
            key={`${tagName}-${index}`}
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-200"
            onClick={(event) => {
              event.stopPropagation();
              setInsertionIndex(index + 1);
              inputRef.current?.focus();
            }}
          >
            <span>{tagName}</span>
            {!disabled ? (
              <span
                role="button"
                tabIndex={-1}
                onClick={(event) => {
                  event.stopPropagation();
                  removeTagAt(index);
                }}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-700"
              >
                <X className="h-3 w-3" />
              </span>
            ) : null}
          </button>
        ))}

        <div className="relative min-w-[10rem] flex-1">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(event) => handleInputChange(event.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              if (normalizeTagName(inputValue)) {
                insertTag(inputValue);
              }
            }}
            placeholder={value.length === 0 ? placeholder : ""}
            disabled={disabled}
            className="h-8 w-full border-0 bg-transparent px-0 text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />

          {ghostSuffix && inputValue ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex h-8 items-center text-sm"
            >
              <span className="invisible whitespace-pre">{inputValue}</span>
              <span className="whitespace-pre text-slate-300">{ghostSuffix}</span>
            </div>
          ) : null}
        </div>

        {value.slice(activeInsertionIndex).map((tagName, index) => {
          const actualIndex = activeInsertionIndex + index;

          return (
            <button
              key={`${tagName}-${actualIndex}`}
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-200"
              onClick={(event) => {
                event.stopPropagation();
                setInsertionIndex(actualIndex);
                inputRef.current?.focus();
              }}
            >
              <span>{tagName}</span>
              {!disabled ? (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeTagAt(actualIndex);
                  }}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-700"
                >
                  <X className="h-3 w-3" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {showSuggestionMenu ? (
        <div className="absolute top-[calc(100%+0.5rem)] left-0 z-20 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/70">
          {isLoadingSuggestions ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Recherche de tags…</span>
            </div>
          ) : null}

          {!isLoadingSuggestions && visibleSuggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">
              Aucun tag similaire pour le moment.
            </div>
          ) : null}

          {!isLoadingSuggestions
            ? visibleSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    index === highlightedIndex
                      ? "bg-slate-100 text-cobam-dark-blue"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => insertTag(suggestion.name)}
                >
                  <span className="font-medium">{suggestion.name}</span>
                  <span className="text-xs text-slate-400">{suggestion.slug}</span>
                </button>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
