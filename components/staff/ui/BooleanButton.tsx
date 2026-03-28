interface Props {
    disabled?: boolean
    checked: boolean
    onClick?: (checked: boolean) => void
    id?: string
}

export default function BooleanButton({disabled, checked, onClick, id}: Props){
    const __onClick__ = disabled || !onClick ? undefined : () => onClick(!checked)
    
    return (
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={__onClick__}
            className={`mt-0.5 inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border transition-colors ${
                checked
                ? "border-cobam-water-blue bg-cobam-water-blue"
                : "border-slate-300 bg-slate-200"
            } ${disabled ? "cursor-not-allowed opacity-80" : ""}`}
            >
            <span
                className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                checked ? "translate-x-6" : "translate-x-1"
                }`}
            />
        </button>
    );
}