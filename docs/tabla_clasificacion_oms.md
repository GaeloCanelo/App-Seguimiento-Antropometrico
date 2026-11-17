# Tabla 2 — Puntos de Corte y Clasificación Referencial (OMS 2006 / 2007 y NOM-031-SSA2-1999)

> **Propuesta técnica para revisión del equipo y anexión en Sección 11 (Anexos) del Reporte Final.**
>
> Nota operativa: Todos los resultados deben acompañarse en UI y PDF del aviso permanente:
> **"Clasificación referencial, no diagnóstica."**

---

## 1. Peso para la Edad (`P_E`)

Fuente: OMS (2007) *Cursos de capacitación sobre la evaluación del crecimiento del niño* / NOM-031-SSA2-1999.

| Rango de Puntaje Z | Código Interno | Clasificación Referencial | Color Sugerido (UI/PDF) |
| :--- | :--- | :--- | :--- |
| $Z < -3$ | `PESO_BAJO_SEVERO` | Peso muy bajo para la edad (bajo peso severo) | Rojo (`#C62828`) |
| $-3 \le Z < -2$ | `PESO_BAJO` | Peso bajo para la edad (bajo peso moderado) | Naranja (`#EF6C00`) |
| $-2 \le Z \le +1$ | `NORMAL` | Peso normal para la edad | Verde (`#2E7D32`) |
| $+1 < Z \le +2$ | `ALERTA_PESO_ALTO` | Riesgo de peso elevado *(evaluar con P/T e IMC/E)* | Amarillo/Ámbar (`#F9A825`) |
| $Z > +2$ | `PESO_ALTO` | Peso elevado para la edad *(evaluar con P/T e IMC/E)* | Naranja (`#EF6C00`) |

*(Nota clínica OMS: La OMS advierte que `P/E` por encima de `+1 Z` no diagnostica sobrepeso por sí solo; se debe evaluar junto con `P/T` e `IMC/E`.)*

---

## 2. Longitud / Talla para la Edad (`T_E`)

| Rango de Puntaje Z | Código Interno | Clasificación Referencial | Color Sugerido (UI/PDF) |
| :--- | :--- | :--- | :--- |
| $Z < -3$ | `TALLA_BAJA_SEVERA` | Talla baja severa (retraso de crecimiento severo) | Rojo (`#C62828`) |
| $-3 \le Z < -2$ | `TALLA_BAJA` | Talla baja (retraso de crecimiento moderado) | Naranja (`#EF6C00`) |
| $-2 \le Z \le +2$ | `NORMAL` | Longitud/talla normal para la edad | Verde (`#2E7D32`) |
| $Z > +2$ | `TALLA_ALTA` | Longitud/talla alta para la edad *(muy alto si $> +3$)* | Azul/Info (`#1565C0`) |

---

## 3. Peso para la Longitud / Talla (`P_T`) e IMC para la Edad (`IMC_E`)

*(Mismos puntos de corte oficiales en niños de 0 a 5 años según OMS 2007)*

| Rango de Puntaje Z | Código Interno | Clasificación Referencial | Color Sugerido (UI/PDF) |
| :--- | :--- | :--- | :--- |
| $Z < -3$ | `EMACIACION_SEVERA` | Emaciación severa (desnutrición aguda severa) | Rojo (`#C62828`) |
| $-3 \le Z < -2$ | `EMACIACION` | Emaciación (desnutrición aguda moderada) | Naranja (`#EF6C00`) |
| $-2 \le Z \le +1$ | `NORMAL` | Estado nutricional normal | Verde (`#2E7D32`) |
| $+1 < Z \le +2$ | `RIESGO_SOBREPESO` | Posible riesgo de sobrepeso | Amarillo/Ámbar (`#F9A825`) |
| $+2 < Z \le +3$ | `SOBREPESO` | Sobrepeso | Naranja (`#EF6C00`) |
| $Z > +3$ | `OBESIDAD` | Obesidad | Rojo (`#C62828`) |

*(Nota de dominio para `P_T`: Si edad $< 24$ meses y longitud ajustada fuera de `[45.0, 110.0]` cm, o si edad $\ge 24$ meses y talla ajustada fuera de `[65.0, 120.0]` cm, el estado es `NO_APLICA`.)*

---

## 4. Perímetro Cefálico para la Edad (`PC_E`)

| Rango de Puntaje Z | Código Interno | Clasificación Referencial | Color Sugerido (UI/PDF) |
| :--- | :--- | :--- | :--- |
| $Z < -3$ | `MICROCEFALIA_SEVERA` | Perímetro cefálico muy por debajo de lo esperado ($< -3$ DE) | Rojo (`#C62828`) |
| $-3 \le Z < -2$ | `MICROCEFALIA` | Perímetro cefálico bajo ($< -2$ DE, sugestivo de microcefalia) | Naranja (`#EF6C00`) |
| $-2 \le Z \le +2$ | `NORMAL` | Perímetro cefálico normal para la edad | Verde (`#2E7D32`) |
| $+2 < Z \le +3$ | `MACROCEFALIA` | Perímetro cefálico elevado ($> +2$ DE, sugestivo de macrocefalia) | Naranja (`#EF6C00`) |
| $Z > +3$ | `MACROCEFALIA_SEVERA` | Perímetro cefálico muy por encima de lo esperado ($> +3$ DE) | Rojo (`#C62828`) |

---

## 5. Umbrales de Plausibilidad Biológica (Alerta de Valor Atípico — `CU-15` / `HU-13`)

Cuando se supera cualquiera de estos umbrales, el sistema solicita al médico **«Corregir»** o **«Confirmar valor»** (marcando `es_atipico = 1` y `atipico_confirmado = 1`):

* `T_E`: $|Z| > 6$
* `P_E`: $Z < -6$ o $Z > +5$
* `P_T`: $|Z| > 5$
* `IMC_E`: $|Z| > 5$
* `PC_E`: $|Z| > 5$
