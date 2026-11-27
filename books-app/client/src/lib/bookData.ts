export const money = (value: number | string | null | undefined) => `KES ${Number(value ?? 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
export const dateLabel = (value: string | Date) => new Date(value).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
export const percent = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
