<button
  key={t.id}
  onClick={() =>
    onSelect({
      id: t.id,
      user_id: t.user_id,
      kind: t.kind,
    })
  }
  className={`group relative flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all ${
    active
      ? "bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_2px_10px_rgba(26,115,232,.4)] border-white/10"
      : "border-transparent hover:bg-muted"
  }`}
>
  {active && (
    <div
      className="absolute bottom-0 left-[10%] right-[10%] h-2
                 bg-blue-300/50 blur-md rounded-full"
    />
  )}

  <span
    className="text-base shrink-0"
    onClick={
      isMe
        ? (e) => {
            e.stopPropagation();
            setEmojiEditFor(
              emojiEditFor === t.id ? null : t.id
            );
          }
        : undefined
    }
  >
    {t.emoji}
  </span>

  {open && (
    <>
      <span
        className={`truncate flex-1 text-xs ${
          active ? "font-semibold" : "font-medium"
        }`}
      >
        {t.name}
      </span>

      {isMe && (
        <button
          onClick={(e) => remove(t, e)}
          className={`
            h-5 w-5 rounded opacity-0
            group-hover:opacity-100
            transition
            ${
              active
                ? "hover:bg-white/20"
                : "hover:bg-red-500/10"
            }
          `}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </>
  )}
</button>
