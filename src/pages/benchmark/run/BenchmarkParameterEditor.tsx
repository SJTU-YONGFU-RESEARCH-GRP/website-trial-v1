import type { JsonObject, JsonPrimitive, ParameterDefinitionV1, ToolCapabilityV1 } from "../../../../shared/contracts/v1";

interface ParameterControlProps {
  definition: ParameterDefinitionV1;
  value: JsonPrimitive | JsonPrimitive[] | undefined;
  onChange(value: JsonPrimitive | JsonPrimitive[]): void;
}

function ParameterControl({ definition, value, onChange }: ParameterControlProps) {
  if (definition.type === "boolean") {
    return <input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} />;
  }
  if (definition.type === "enum") {
    return (
      <select value={typeof value === "string" || typeof value === "number" ? String(value) : ""} onChange={(event) => onChange(event.target.value)}>
        {definition.enumValues.map((option) => <option key={String(option)} value={String(option)}>{String(option)}</option>)}
      </select>
    );
  }
  if ((definition.type === "string-list" || definition.type === "number-list") && definition.enumValues.length) {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="benchmark-check-grid">
        {definition.enumValues.map((option) => {
          const text = String(option);
          return <label key={text}><input type="checkbox" checked={selected.includes(text)} onChange={(event) => {
            const next = event.target.checked ? [...selected, text] : selected.filter((item) => item !== text);
            onChange(definition.type === "number-list" ? next.map(Number) : next);
          }} />{text}</label>;
        })}
      </div>
    );
  }
  const numeric = definition.type === "number" || definition.type === "integer";
  const freeList = definition.type === "string-list" || definition.type === "number-list";
  return (
    <input
      type={numeric ? "number" : "text"}
      value={Array.isArray(value) ? value.join(", ") : typeof value === "string" || typeof value === "number" ? value : ""}
      min={definition.minimum ?? undefined}
      max={definition.maximum ?? undefined}
      step={definition.type === "integer" ? 1 : numeric ? "any" : undefined}
      onChange={(event) => onChange(numeric ? Number(event.target.value) : freeList
        ? event.target.value.split(",").map((item) => item.trim()).filter(Boolean).map((item) => definition.type === "number-list" ? Number(item) : item)
        : event.target.value)}
    />
  );
}

interface BenchmarkParameterEditorProps {
  capability: ToolCapabilityV1;
  values: JsonObject;
  disabled?: boolean;
  onChange(values: JsonObject): void;
}

export function BenchmarkParameterEditor({ capability, values, disabled, onChange }: BenchmarkParameterEditorProps) {
  return (
    <details className="benchmark-tool-parameters" open>
      <summary><span>{capability.label} parameters</span><small>{capability.toolVersion ?? "version unavailable"}</small></summary>
      <div className="benchmark-parameter-grid">
        {capability.parameters.map((definition) => (
          <label key={definition.id} className="benchmark-parameter-field">
            <span>{definition.label}{definition.unit ? ` (${definition.unit})` : ""}</span>
            <small>{definition.description}</small>
            <fieldset disabled={disabled}>
              <ParameterControl definition={definition} value={values[definition.id] as JsonPrimitive | JsonPrimitive[] | undefined} onChange={(value) => onChange({ ...values, [definition.id]: value })} />
            </fieldset>
          </label>
        ))}
      </div>
    </details>
  );
}
