import type { Track } from '../types'

export const pythonTrack: Track = {
  id: 'python',
  title: 'Python',
  description: 'אותה לוגיקת מסחר, בשפה אחרת — מתרגמים את הקוד של האתר לפייתון ומנתחים טריידים.',
  lessons: [
    // ─────────────────────────────────────────────────────────────────────────
    {
      slug: 'python-setup-basics',
      title: 'התקנה, venv ופונקציות ראשונות',
      summary: 'מתקינים פייתון על Windows ARM64, יוצרים venv, ומתרגמים את `calcPnl`, `calcActualR` ו-`resultFromR` לפייתון.',
      minutes: 20,
      blocks: [
        {
          kind: 'text',
          body: 'במסלול הזה אין קוד חדש לאתר — לוקחים את הלוגיקה שכבר קיימת ב-TypeScript ומתרגמים אותה לפייתון, ואז משתמשים בפייתון כדי לנתח טריידים. בשיעור הראשון: התקנה, ואז שלוש הפונקציות הקטנות שמחשבות רווח, R ותוצאה.\n\nהמחשב שלכם הוא **Windows 11 על ARM64**, ול-python.org יש installer נפרד לארכיטקטורה הזו: בדף ההורדות של Windows בחרו **Windows installer (ARM64)** — לא את ה-"64-bit", שהוא x64. צריך גרסה 3.12 ומעלה (בשיעור 3 נשתמש ב-`match`, שקיים מ-3.10). בהתקנה סמנו **Add python.exe to PATH**. ה-installer מתקין גם את `py`, ה-launcher של Windows שיודע לבחור בין כמה גרסאות מותקנות.\n\nאם `python` פותח את Microsoft Store במקום לרוץ — זה alias של Windows. כבו אותו ב-Settings תחת **App execution aliases**, או פשוט השתמשו ב-`py`.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'חבילה שכתובה כולה בפייתון עובדת בכל מקום. חבילה עם קוד native (C, C++, Rust) צריכה **wheel** — קובץ מקומפל מראש — שמתאים לארכיטקטורה, עם `win_arm64` בשם הקובץ. החבילות הגדולות כבר שם: בבדיקה באוקטובר 2026, `pip install pandas` על פייתון ARM64 הוריד `numpy-2.5.4-cp313-cp313-win_arm64.whl` ו-pandas 3 בלי לקמפל כלום. חבילות קטנות יותר עלולות עדיין לפרסם רק `win_amd64`; אז pip ינסה לבנות מקוד מקור, וזה בדרך כלל נכשל בלי כלי ה-build של Visual Studio. הפתרון: להתקין **בנוסף** את ה-installer של x64. הוא רץ על ARM באמולציה — איטי יותר, אבל טוען כל wheel של x64. venv שנוצר ממנו הוא x64 כולו, ושם `platform.machine()` יחזיר `AMD64`.',
        },
        {
          kind: 'text',
          body: '**venv** הוא המקבילה של `node_modules`: ספרייה פרטית לפרויקט, כך ש-`pip install` לא נוגע בפייתון הגלובלי. ההבדל: Node מוצא את `node_modules` לבד, ובפייתון צריך **להפעיל** (activate) את ה-venv בכל טרמינל חדש. אחרי ההפעלה `python` ו-`pip` מצביעים על העותק שבתוך `.venv`.\n\nאת `.venv/` מוסיפים ל-`.gitignore`, ואת רשימת החבילות שומרים ב-`requirements.txt` — בערך כמו `package.json`.',
        },
        {
          kind: 'snippet',
          lang: 'bash',
          title: 'Git Bash — בדיקה, venv והרצה',
          code: `py -0                       # every installed Python; * marks the default
python -c "import platform; print(platform.machine())"   # ARM64 = native build

mkdir trade-py && cd trade-py
py -m venv .venv                     # private interpreter + packages for this folder
source .venv/Scripts/activate        # PowerShell: .venv/Scripts/Activate.ps1
python -m pip install pytest pandas
python -m pip freeze > requirements.txt

python pnl.py                        # run a file
deactivate`,
        },
        {
          kind: 'text',
          body: 'עכשיו לקוד. זו הפונקציה שמחשבת רווח של חלק מפוזיציה, מתוך מנוע ה-FIFO של האתר:',
        },
        {
          kind: 'source',
          title: 'המקור ב-TypeScript',
          ref: { file: 'lib/trade/fifo.ts', start: 'function calcPnl(' },
          notes: [
            { match: 'function calcPnl(', text: 'בפייתון: `def calc_pnl(...):`. במקום סוגריים מסולסלים יש נקודתיים והזחה, ושמות נכתבים ב-snake_case.' },
            { match: '? (exitPrice - avgEntry) * qty', text: 'ה-ternary. בפייתון הסדר שונה: `A if condition else B` — הערך קודם, התנאי באמצע.' },
          ],
        },
        {
          kind: 'compare',
          left: {
            lang: 'ts',
            title: 'TypeScript',
            code: `function calcPnl(direction: 'Long' | 'Short', avgEntry: number, exitPrice: number, qty: number): number {
  return direction === 'Long'
    ? (exitPrice - avgEntry) * qty
    : (avgEntry - exitPrice) * qty
}`,
          },
          right: {
            lang: 'python',
            title: 'Python',
            code: `def calc_pnl(direction: str, avg_entry: float, exit_price: float, qty: float) -> float:
    return (
        (exit_price - avg_entry) * qty
        if direction == "Long"
        else (avg_entry - exit_price) * qty
    )`,
          },
        },
        {
          kind: 'text',
          body: 'שלושה הבדלים שרואים כבר כאן:\n\n- **ההזחה היא התחביר.** אין `{}` — גוף הפונקציה הוא כל השורות המוזחות אחרי ה-`:`. ארבעה רווחים הם התקן, וערבוב טאבים ורווחים הוא שגיאה.\n- **`==` ולא `===`.** פייתון לא ממירה טיפוסים בהשוואה, ולכן `==` כבר "קפדני": `1 == "1"` הוא `False`.\n- **type hints** (`: float`, `-> float`) נראים כמו הטיפוסים של TS, אבל פייתון **לא בודקת אותם** בזמן ריצה. כלי כמו mypy או pyright (שמובנה ב-VS Code) בודק אותם, בדיוק כמו ש-`tsc` בודק TS. `float | None` הוא המקבילה של `number | null`.\n\nעכשיו שתי הפונקציות הבאות באותו קובץ — חישוב R וסיווג התוצאה:',
        },
        {
          kind: 'source',
          title: 'calcActualR + resultFromR',
          ref: { file: 'lib/trade/fifo.ts', start: 'export function calcActualR(', end: "return 'Breakeven'" },
          notes: [
            { match: 'if (stopPrice === null) return null', text: 'בפייתון: `if stop_price is None: return None`. `None` הוא ה-null של פייתון, ויש רק אחד — אין `undefined`.' },
            { match: 'Math.abs(', text: '`abs()` היא פונקציה מובנית, בלי import.' },
            { match: '|| totalQuantityOpened === 0', text: 'בפייתון האופרטורים הלוגיים הם מילים: `or`, `and`, `not`.' },
            { match: 'actualR ?? realizedPnl', text: 'לפייתון אין `??`. ראו את האזהרה למטה — זה המקום שבו הכי קל לשבור את הפורט.' },
          ],
        },
        {
          kind: 'snippet',
          lang: 'python',
          title: 'pnl.py — הפורט המלא',
          code: `MIN_RISK_PER_SHARE = 0.0001


def calc_pnl(direction: str, avg_entry: float, exit_price: float, qty: float) -> float:
    return (exit_price - avg_entry) * qty if direction == "Long" else (avg_entry - exit_price) * qty


def calc_actual_r(
    total_realized_pnl: float,
    avg_entry_price: float,
    stop_price: float | None,
    total_quantity_opened: float,
) -> float | None:
    if stop_price is None:
        return None
    risk_per_share = abs(avg_entry_price - stop_price)
    if risk_per_share < MIN_RISK_PER_SHARE or total_quantity_opened == 0:
        return None
    return total_realized_pnl / (risk_per_share * total_quantity_opened)


def result_from_r(actual_r: float | None, realized_pnl: float) -> str:
    basis = actual_r if actual_r is not None else realized_pnl
    if basis > 0:
        return "Win"
    elif basis < 0:
        return "Loss"
    else:
        return "Breakeven"


# Long 100 @ 140, stop 130, sold 100 @ 150, $1 commission on each side
realized = calc_pnl("Long", 140, 150, 100) - 2
r = calc_actual_r(realized, 140, 130, 100)
print(f"pnl={realized:,.2f}  R={r:.3f}  result={result_from_r(r, realized)}")
# pnl=998.00  R=0.998  result=Win`,
        },
        {
          kind: 'text',
          body: 'השורה האחרונה היא **f-string** — המקבילה של template literal ב-JS: `f"R={r}"` מכניס את הערך של `r` לתוך המחרוזת. אחרי נקודתיים בתוך הסוגריים בא פורמט: `{x:.3f}` הוא שלוש ספרות אחרי הנקודה, `{x:,.2f}` מוסיף מפריד אלפים, `{x:.1%}` מציג אחוזים ו-`{x:+.2f}` מוסיף סימן גם למספר חיובי.\n\nו-`elif` הוא פשוט `else if` בכתיב של פייתון.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'הפיתוי הוא לתרגם את `actualR ?? realizedPnl` ל-`actual_r or realized_pnl`. זה בדיוק הבאג ש-`??` נועד למנוע: `or` מחזיר את הצד הימני כשהשמאלי **falsy**, ו-`0.0` הוא falsy. כך `result_from_r(0.0, -3)` יחזיר `"Loss"` במקום `"Breakeven"`. התרגום הנכון הוא `actual_r if actual_r is not None else realized_pnl`. ובדיקת None כותבים תמיד עם `is None` / `is not None`, לא עם `==`.',
        },
        {
          kind: 'snippet',
          lang: 'python',
          title: 'truthiness — נסו ב-REPL (הקלידו python בטרמינל)',
          code: `actual_r = 0.0
actual_r or -3                                # -3   (0.0 is falsy)
actual_r if actual_r is not None else -3      # 0.0  (the ?? behaviour)
None or -3                                    # -3

bool(0), bool(""), bool(None), bool([])   # all False
bool([0]), bool("0")                      # True, True
# careful: in JS an empty array is truthy, in Python an empty list is falsy`,
        },
        {
          kind: 'quiz',
          question: 'כתבנו בטעות `basis = actual_r or realized_pnl`. מה תחזיר `result_from_r(0.0, -3)`?',
          options: ['`"Win"`', '`"Loss"`', '`"Breakeven"`', 'שגיאה, כי אי אפשר להשוות `None`'],
          answer: 1,
          explanation: '`0.0 or -3` מחזיר `-3`, כי `0.0` falsy. אחרי זה `-3 < 0`, והתוצאה `"Loss"`. עם `actual_r if actual_r is not None else realized_pnl` הבסיס נשאר `0.0` והתוצאה `"Breakeven"` — כמו ב-TS.',
        },
        {
          kind: 'quiz',
          question: 'הרשימה `trades` ריקה. מה מודפס מ-`print("yes" if trades else "no")` בפייתון, ומה היה מודפס מהקוד המקביל ב-JS עם מערך ריק?',
          options: ['`yes` בשתי השפות', '`no` בשתי השפות', 'בפייתון `no`, ב-JS `yes`', 'בפייתון `yes`, ב-JS `no`'],
          answer: 2,
          explanation: 'בפייתון כל אוסף ריק (רשימה, dict, מחרוזת) הוא falsy, ולכן `if trades:` הוא הדרך המקובלת לשאול "יש משהו?". ב-JS מערך ריק הוא אובייקט, ולכן truthy — שם צריך `trades.length > 0`.',
        },
        {
          kind: 'exercise',
          prompt: 'כתבו פונקציה `format_r(actual_r: float | None) -> str` שמחזירה `"n/a"` כשאין R, ואחרת את ה-R עם סימן ושתי ספרות ו-`R` בסוף — למשל `2.4` הופך ל-`"+2.40R"`. שימו לב: `0.0` הוא R תקין ולא "אין R".',
          hint: 'בדקו `is None` ולא `if not actual_r`. לפורמט: `f"{actual_r:+.2f}R"`.',
          solution: {
            lang: 'python',
            code: `def format_r(actual_r: float | None) -> str:
    if actual_r is None:
        return "n/a"
    return f"{actual_r:+.2f}R"


print(format_r(None))    # n/a
print(format_r(0.0))     # +0.00R  (not "n/a")
print(format_r(-1.002))  # -1.00R
print(format_r(2.4))     # +2.40R`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    {
      slug: 'python-data-structures',
      title: 'list, dict ו-dataclass — מבני הנתונים של טרייד',
      summary: 'list, dict, tuple ו-set מול מערכים ואובייקטים של JS, list comprehension במקום `map`/`filter`, ו-`dataclass` עם type hints שמחקה את `NormalizedExecution`.',
      minutes: 22,
      blocks: [
        {
          kind: 'text',
          body: 'לפייתון ארבעה אוספים מובנים, ולכל אחד יש מקבילה קרובה ב-JS:\n\n- **list** `[1, 2, 3]` — כמו מערך. אפשר לשנות אותו, יש לו סדר, והאורך הוא `len(xs)` במקום `xs.length`.\n- **dict** `{"ticker": "AAPL"}` — כמו אובייקט או `Map`. המפתחות הם ערכים של ממש (בדרך כלל מחרוזות במירכאות), והגישה היא רק `d["key"]` — אין `d.key`. שומר על סדר ההכנסה, בדיוק כמו `Map`.\n- **tuple** `("AAPL", 140.0)` — רשימה שאי אפשר לשנות. מתאימה לזוגות ולהחזרת כמה ערכים מפונקציה.\n- **set** `{"AAPL", "TSLA"}` — כמו `new Set()`: בלי כפילויות, ובלי סדר מובטח.',
        },
        {
          kind: 'snippet',
          lang: 'python',
          title: 'ארבעת האוספים בפעולה',
          code: `pnls = [998, -501, -1501, 2400]
pnls.append(350)              # push
pnls[-1]                      # 350 - a negative index counts from the end
pnls[1:3]                     # [-501, -1501] - a slice, like .slice(1, 3)

trade = {"ticker": "AAPL", "realized_pnl": 998.0, "actual_r": 0.998}
trade["ticker"]               # "AAPL"
trade.get("stop_price")       # None - trade["stop_price"] would raise KeyError
"actual_r" in trade           # True

entry = ("AAPL", 140.0)
ticker, price = entry         # unpacking, like const [ticker, price] = entry

tickers = {"AAPL", "TSLA", "AAPL"}
len(tickers)                  # 2
empty_dict, empty_set = {}, set()   # {} is an empty dict, not an empty set`,
        },
        {
          kind: 'text',
          body: 'ב-JS מסננים וממפים עם `filter`, `map` ו-`reduce`. בפייתון הכלי המרכזי הוא **list comprehension** — לולאה בתוך סוגריים מרובעים שבונה רשימה חדשה. כך `calcStats` מפרידה בין טריידים מרוויחים למפסידים:',
        },
        {
          kind: 'source',
          title: 'filter + reduce ב-calcStats',
          ref: { file: 'lib/utils/calculations.ts', start: 'const winners = trades.filter(', end: 'const totalPnl = trades.reduce' },
          notes: [
            { match: 'trades.filter(t => t.realizedPnl > 0)', text: 'בפייתון: `[t for t in trades if t.realized_pnl > 0]`. קוראים את זה כמעט כמו משפט באנגלית.' },
            { match: 'winners.reduce(', text: 'סכום עם צובר ידני. בפייתון: `sum(t.realized_pnl for t in winners)`. וגם `sum([])` מחזיר `0`, אז אין צורך בערך התחלתי.' },
            { match: 'winners.length > 0 ?', text: 'אותו ternary מהשיעור הקודם: `gross_win / len(winners) if winners else 0` — רשימה ריקה היא falsy.' },
          ],
        },
        {
          kind: 'compare',
          left: {
            lang: 'ts',
            title: 'JS: מתודות של מערך',
            code: `const winners = trades.filter(t => t.realizedPnl > 0)
const pnls = trades.map(t => t.realizedPnl)
const grossWin = winners.reduce((s, t) => s + t.realizedPnl, 0)
const tickers = new Set(trades.map(t => t.ticker))
const byId = new Map(trades.map(t => [t.id, t]))
const anyLoss = trades.some(t => t.realizedPnl < 0)`,
          },
          right: {
            lang: 'python',
            title: 'Python: comprehensions',
            code: `winners = [t for t in trades if t.realized_pnl > 0]
pnls = [t.realized_pnl for t in trades]
gross_win = sum(t.realized_pnl for t in winners)
tickers = {t.ticker for t in trades}
by_id = {t.id: t for t in trades}
any_loss = any(t.realized_pnl < 0 for t in trades)`,
          },
        },
        {
          kind: 'callout',
          tone: 'tip',
          body: 'בתוך `sum(...)` ו-`any(...)` אין סוגריים מרובעים: זה **generator expression**, שמייצר את הערכים אחד-אחד בלי לבנות רשימה בזיכרון. `any` גם עוצר בהתאמה הראשונה, בדיוק כמו `some`. לפייתון יש גם `map()` ו-`filter()`, אבל comprehension הוא הסגנון המקובל.',
        },
        {
          kind: 'text',
          body: 'לנתונים עם שדות קבועים — ביצוע, טרייד — משתמשים ב-`@dataclass`. כותבים רשימת שדות עם type hints, והדקורטור מייצר לבד את הבנאי (`__init__`), הדפסה קריאה (`__repr__`) והשוואה לפי ערכים (`__eq__`). זה מקביל ל-interface של TS, אבל זו גם מחלקה אמיתית שיוצרים ממנה מופעים. הנה הממשק שהאתר משתמש בו לכל ביצוע מהברוקר:',
        },
        {
          kind: 'source',
          title: 'NormalizedExecution',
          ref: { file: 'types/trade.ts', start: 'export interface NormalizedExecution {' },
          notes: [
            { match: "side: 'BUY' | 'SELL' | 'SSHORT'", text: 'union של מחרוזות קבועות. בפייתון: `Literal["BUY", "SELL", "SSHORT"]` מהמודול `typing`.' },
            { match: 'brokerOrderId?: string', text: 'שדה אופציונלי. ב-dataclass: `broker_order_id: str | None = None`. שדות עם ברירת מחדל חייבים לבוא **אחרי** כל השדות שאין להם ברירת מחדל — ב-TS אין הגבלה כזו.' },
            { match: 'executedAt: Date', text: 'המקבילה היא `datetime` מהמודול `datetime`.' },
          ],
        },
        {
          kind: 'snippet',
          lang: 'python',
          title: 'execution.py',
          code: `from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

Side = Literal["BUY", "SELL", "SSHORT"]
Direction = Literal["Long", "Short"]


@dataclass(frozen=True)
class Execution:
    broker_exec_id: str
    ticker: str
    side: Side
    quantity: float          # always positive
    price: float
    commission: float
    executed_at: datetime
    broker_order_id: str | None = None
    currency: str | None = None


@dataclass
class OpenTrade:
    id: str
    direction: Direction
    avg_entry_price: float
    total_quantity: float
    total_quantity_opened: float
    total_commission: float
    realized_pnl: float
    opened_at: datetime
    stop_price: float | None


at = datetime(2026, 4, 23, 18, 30, tzinfo=timezone.utc)
ex = Execution("E1", "AAPL", "BUY", 100, 150.0, 1.0, at)
print(ex)          # Execution(broker_exec_id='E1', ticker='AAPL', side='BUY', ...)
print(ex.price)    # 150.0
print(ex == Execution("E1", "AAPL", "BUY", 100, 150.0, 1.0, at))   # True
# ex.price = 151   -> FrozenInstanceError, because of frozen=True`,
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'שני דברים ש-TS עושה בשבילכם ופייתון לא:\n\n- `Execution("E1", "AAPL", "HOLD", ...)` **ירוץ בלי שגיאה** — `Literal` הוא רק רמז. רק mypy או pyright יתפסו את זה לפני הריצה.\n- ברירת מחדל שהיא רשימה (`tags: list[str] = []`) אסורה ב-dataclass, כי כל המופעים היו חולקים **אותה** רשימה. הדרך הנכונה היא `tags: list[str] = field(default_factory=list)` — המקבילה של `tags: string[]` ב-`ClosedTrade`.',
        },
        {
          kind: 'quiz',
          question: 'יוצרים שני מופעים של אותו dataclass עם ערכים זהים בכל השדות: `a` ו-`b`. מה מחזירים `a == b` ו-`a is b`?',
          options: ['`True` ו-`True`', '`True` ו-`False`', '`False` ו-`False`', '`False` ו-`True`'],
          answer: 1,
          explanation: 'ה-dataclass מייצר `__eq__` שמשווה שדה מול שדה, ולכן `a == b` הוא `True`. האופרטור `is` בודק אם זה **אותו אובייקט** בזיכרון — כמו `===` על אובייקטים ב-JS — ולכן `False`.',
        },
        {
          kind: 'quiz',
          question: 'מה הטיפוס של `x = {}` בפייתון?',
          options: ['set ריק', 'dict ריק', 'tuple ריק', 'שגיאת תחביר'],
          answer: 1,
          explanation: 'סוגריים מסולסלים ריקים הם dict. set ריק יוצרים עם `set()`. `{"AAPL"}` — עם ערכים ובלי נקודתיים — הוא כבר set.',
        },
        {
          kind: 'source',
          title: 'setupPerformance — המקור לתרגיל',
          ref: { file: 'lib/utils/calculations.ts', start: 'export function setupPerformance(' },
          notes: [
            { match: "t.setupType ?? 'untagged'", text: 'זוכרים את `??`? בפייתון: `t.setup_type if t.setup_type is not None else "untagged"`.' },
            { match: 'new Map<string, ClosedTrade[]>()', text: 'dict של רשימות. `collections.defaultdict(list)` יוצר רשימה ריקה אוטומטית למפתח חדש, וחוסך את ה-`if (!groups.has(key))`.' },
            { match: 'Array.from(groups.entries())', text: '`groups.items()` נותן זוגות (מפתח, ערך) כ-tuples, ואפשר לפרק אותם ישר בלולאה: `for setup_type, group in groups.items():`.' },
          ],
        },
        {
          kind: 'exercise',
          prompt: 'הגדירו dataclass בשם `ClosedTrade` עם השדות `ticker`, `realized_pnl`, `actual_r` (יכול להיות None), `setup_type` (ברירת מחדל None) ו-`tags` (ברירת מחדל: רשימה ריקה). אחר כך כתבו `setup_performance(trades)` שמחזירה רשימת dicts עם `setup_type`, `win_rate`, `avg_r` ו-`count` — בדיוק לפי `setupPerformance`: מנצח הוא `realized_pnl > 0`, ה-R הממוצע רק על טריידים שיש להם R (ו-0 אם אין), ו-`"untagged"` כש-`setup_type` הוא None.',
          hint: '`defaultdict(list)` לקיבוץ, comprehension לסינון המנצחים ול-R, ו-`field(default_factory=list)` ל-`tags`.',
          solution: {
            lang: 'python',
            code: `from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class ClosedTrade:
    ticker: str
    realized_pnl: float
    actual_r: float | None
    setup_type: str | None = None
    tags: list[str] = field(default_factory=list)


def setup_performance(trades: list[ClosedTrade]) -> list[dict]:
    groups: dict[str, list[ClosedTrade]] = defaultdict(list)
    for t in trades:
        key = t.setup_type if t.setup_type is not None else "untagged"
        groups[key].append(t)

    result = []
    for setup_type, group in groups.items():
        wins = [t for t in group if t.realized_pnl > 0]
        rs = [t.actual_r for t in group if t.actual_r is not None]
        result.append({
            "setup_type": setup_type,
            "win_rate": len(wins) / len(group),
            "avg_r": sum(rs) / len(rs) if rs else 0,
            "count": len(group),
        })
    return result


trades = [
    ClosedTrade("AAPL", 998, 0.998, "breakout"),
    ClosedTrade("TSLA", -501, -1.002, "breakout"),
    ClosedTrade("NVDA", 350, None),
]
for row in setup_performance(trades):
    print(row)
# {'setup_type': 'breakout', 'win_rate': 0.5, 'avg_r': -0.0020000000000000018, 'count': 2}
# {'setup_type': 'untagged', 'win_rate': 1.0, 'avg_r': 0, 'count': 1}`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    {
      slug: 'python-fifo-port',
      title: 'פורט של מנוע ה-FIFO: dataclasses ו-match',
      summary: 'מתרגמים את `matchExecution` לפייתון — union של dataclasses במקום discriminated union, ו-`match` (3.10+) במקום `switch` על `action.type`.',
      minutes: 30,
      blocks: [
        {
          kind: 'text',
          body: '`matchExecution` הוא הלב של האתר: הוא מקבל ביצוע אחד ואת הטרייד הפתוח באותו טיקר (או `null`), ומחזיר תיאור של מה צריך לכתוב למסד — אחת מחמש פעולות. הוא פונקציה טהורה, ולכן אפשר לתרגם אותו כמעט שורה בשורה. ב-TS, הפלט מוגדר כ-**discriminated union**:',
        },
        {
          kind: 'source',
          title: 'FifoAction',
          ref: { file: 'types/trade.ts', start: 'export type FifoAction =', lines: 10 },
          notes: [
            { match: "type: 'OPEN';", text: 'השדה `type` הוא ה-discriminant: לפי הערך שלו TS יודע אילו שדות קיימים באובייקט.' },
            { match: "type: 'REVERSAL'", text: 'רק ל-REVERSAL יש `close` ו-`open` — שתי כתיבות שהקורא חייב לבצע באטומיות דרך ה-RPC `reverse_position`.' },
          ],
        },
        {
          kind: 'text',
          body: 'בפייתון אין צורך בשדה `type`: מגדירים **מחלקה נפרדת לכל פעולה**, והמחלקה עצמה היא ה-discriminant. ה-union נכתב בדיוק כמו ב-TS: `FifoAction = Open | ScaleIn | Reduce | Close | Reversal`.\n\nל-`TradeUpdate` — אובייקט שכל השדות שלו אופציונליים (`?:`) — מתאים `TypedDict` עם `total=False`: זה dict רגיל בזמן ריצה, אבל ה-type checker יודע אילו מפתחות מותרים ושאף אחד מהם לא חובה. בזכות זה REDUCE יכול להחזיר רק שלושה שדות, בדיוק כמו ב-TS.\n\nהקובץ `fifo.py` בנוי משלושה חלקים. הראשון — הטיפוסים (גרסה מקוצרת: בלי שדות הברוקר ש-`buildOrderCreate` רק מעתיק):',
        },
        {
          kind: 'snippet',
          lang: 'python',
          title: 'fifo.py — חלק 1: הטיפוסים',
          code: `from dataclasses import dataclass, replace
from datetime import datetime
from typing import Literal, TypedDict

Side = Literal["BUY", "SELL", "SSHORT"]
Direction = Literal["Long", "Short"]
OrderSide = Literal["BUY", "SELL"]
Result = Literal["Win", "Loss", "Breakeven"]

MIN_RISK_PER_SHARE = 0.0001


@dataclass(frozen=True)
class Execution:
    broker_exec_id: str
    ticker: str
    side: Side
    quantity: float
    price: float
    commission: float
    executed_at: datetime
    broker_order_id: str | None = None


@dataclass(frozen=True)
class OpenTrade:
    id: str
    direction: Direction
    avg_entry_price: float
    total_quantity: float
    total_quantity_opened: float
    total_commission: float
    realized_pnl: float
    opened_at: datetime
    stop_price: float | None


@dataclass(frozen=True)
class OrderCreate:
    side: OrderSide
    quantity: float
    price: float
    commission: float
    executed_at: datetime
    broker_exec_id: str


@dataclass(frozen=True)
class TradeCreate:
    ticker: str
    direction: Direction
    opened_at: datetime
    avg_entry_price: float
    total_quantity: float
    total_quantity_opened: float
    total_commission: float
    realized_pnl: float
    stop_price: float | None = None


class TradeUpdate(TypedDict, total=False):
    avg_entry_price: float
    avg_exit_price: float
    total_quantity: float
    total_quantity_opened: float
    total_commission: float
    realized_pnl: float
    status: Literal["Open", "Closed"]
    closed_at: datetime
    actual_r: float | None
    result: Result


@dataclass(frozen=True)
class Open:
    trade_create: TradeCreate
    order_create: OrderCreate


@dataclass(frozen=True)
class ScaleIn:
    trade_id: str
    trade_update: TradeUpdate
    order_create: OrderCreate


@dataclass(frozen=True)
class Reduce:
    trade_id: str
    trade_update: TradeUpdate
    order_create: OrderCreate


@dataclass(frozen=True)
class Close:
    trade_id: str
    trade_update: TradeUpdate
    order_create: OrderCreate


@dataclass(frozen=True)
class Reversal:
    close: Close    # the close leg has exactly the fields of a Close
    open: Open      # and the open leg the fields of an Open


FifoAction = Open | ScaleIn | Reduce | Close | Reversal`,
        },
        {
          kind: 'source',
          title: 'פוזיציית Long: הוספה וצמצום',
          ref: {
            file: 'lib/trade/fifo.ts',
            start: "if (direction === 'Long') {",
            end: "return { type: 'REDUCE', tradeId: openTrade.id, tradeUpdate: update, orderCreate: buildOrderCreate(exec, 'SELL'",
          },
          notes: [
            { match: 'const newAvgEntry = weightedAvg(', text: 'SCALE_IN: מחיר כניסה ממוצע משוקלל לפי כמויות.' },
            { match: 'realizedPnl: realizedPnl - exec.commission,', text: 'גם העמלה של הוספה "ממומשת" מיד — כך שבסגירה `realizedPnl` כבר כולל את כל העמלות.' },
            { match: 'const newRealizedPnl = realizedPnl + pnl - exec.commission', text: 'הרווח מהמכירה נוסף לרווח שכבר מומש, פחות העמלה של הביצוע הזה.' },
          ],
        },
        {
          kind: 'snippet',
          lang: 'python',
          title: 'fifo.py — חלק 2: פונקציות עזר',
          code: `def weighted_avg(prev_avg: float, prev_qty: float, new_price: float, new_qty: float) -> float:
    return (prev_avg * prev_qty + new_price * new_qty) / (prev_qty + new_qty)


def calc_pnl(direction: Direction, avg_entry: float, exit_price: float, qty: float) -> float:
    return (exit_price - avg_entry) * qty if direction == "Long" else (avg_entry - exit_price) * qty


def calc_actual_r(
    total_realized_pnl: float,
    avg_entry_price: float,
    stop_price: float | None,
    total_quantity_opened: float,
) -> float | None:
    if stop_price is None:
        return None
    risk_per_share = abs(avg_entry_price - stop_price)
    if risk_per_share < MIN_RISK_PER_SHARE or total_quantity_opened == 0:
        return None
    return total_realized_pnl / (risk_per_share * total_quantity_opened)


def result_from_r(actual_r: float | None, realized_pnl: float) -> Result:
    basis = actual_r if actual_r is not None else realized_pnl
    if basis > 0:
        return "Win"
    if basis < 0:
        return "Loss"
    return "Breakeven"


def build_order(ex: Execution, side: OrderSide, commission: float) -> OrderCreate:
    return OrderCreate(side, ex.quantity, ex.price, commission, ex.executed_at, ex.broker_exec_id)


def build_trade(ex: Execution, direction: Direction, quantity: float, commission: float) -> TradeCreate:
    return TradeCreate(
        ticker=ex.ticker,
        direction=direction,
        opened_at=ex.executed_at,
        avg_entry_price=ex.price,
        total_quantity=quantity,
        total_quantity_opened=quantity,
        total_commission=commission,
        realized_pnl=-commission,  # the opening commission is realized immediately
    )


def closed_update(ex: Execution, realized: float, commission: float, actual_r: float | None) -> TradeUpdate:
    return {
        "total_quantity": 0,
        "avg_exit_price": ex.price,
        "realized_pnl": realized,
        "total_commission": commission,
        "status": "Closed",
        "closed_at": ex.executed_at,
        "actual_r": actual_r,
        "result": result_from_r(actual_r, realized),
    }`,
        },
        {
          kind: 'source',
          title: 'REVERSAL: מוכרים יותר ממה שמחזיקים',
          ref: {
            file: 'lib/trade/fifo.ts',
            start: '// Reversal: sell more than the open long position',
            end: "open: { tradeCreate: buildTradeCreate({ ...exec, quantity: newQty }, 'Short'",
          },
          notes: [
            { match: 'const closingCommission = exec.commission * (closingQty / exec.quantity)', text: 'העמלה של הביצוע מתחלקת בין הסגירה לפתיחה לפי היחס בין הכמויות.' },
            { match: '{ ...exec, quantity: closingQty }', text: 'עותק של `exec` עם כמות אחרת. ל-dataclass קפוא יש לזה פונקציה מוכנה: `dataclasses.replace(ex, quantity=closing_qty)`.' },
          ],
        },
        {
          kind: 'text',
          body: 'ב-TS הפונקציה כתובה פעמיים — חצי לפוזיציית Long וחצי ל-Short — כשההבדל היחיד הוא באיזה צד "מוסיפים" ובאיזה "סוגרים". בפורט מקפלים את שני החצאים לאחד עם שלושה משתנים: `is_long`, `open_side` ו-`close_side`. זה refactor ולא תרגום מילולי, ולכן חייבים להוכיח שהתוצאות זהות — זה התפקיד של השיעור הבא (הפורט הזה נבדק גם מול ה-TS על אלפי ביצועים אקראיים, בלי הבדל באף מספר).',
        },
        {
          kind: 'snippet',
          lang: 'python',
          title: 'fifo.py — חלק 3: match_execution',
          code: `def match_execution(ex: Execution, open_trade: OpenTrade | None) -> FifoAction:
    normalized_side: OrderSide = "SELL" if ex.side == "SSHORT" else ex.side

    if open_trade is None:  # OPEN
        direction: Direction = "Long" if ex.side == "BUY" else "Short"
        return Open(
            build_trade(ex, direction, ex.quantity, ex.commission),
            build_order(ex, normalized_side, ex.commission),
        )

    t = open_trade
    is_long = t.direction == "Long"
    adds = ex.side == "BUY" if is_long else ex.side in ("SELL", "SSHORT")
    open_side: OrderSide = "BUY" if is_long else "SELL"
    close_side: OrderSide = "SELL" if is_long else "BUY"

    if adds:  # SCALE_IN
        update: TradeUpdate = {
            "avg_entry_price": weighted_avg(t.avg_entry_price, t.total_quantity, ex.price, ex.quantity),
            "total_quantity": t.total_quantity + ex.quantity,
            "total_quantity_opened": t.total_quantity_opened + ex.quantity,
            "total_commission": t.total_commission + ex.commission,
            "realized_pnl": t.realized_pnl - ex.commission,
        }
        return ScaleIn(t.id, update, build_order(ex, open_side, ex.commission))

    pnl = calc_pnl(t.direction, t.avg_entry_price, ex.price, ex.quantity)
    new_realized = t.realized_pnl + pnl - ex.commission
    new_commission = t.total_commission + ex.commission

    if ex.quantity < t.total_quantity:  # REDUCE
        update = {
            "total_quantity": t.total_quantity - ex.quantity,
            "realized_pnl": new_realized,
            "total_commission": new_commission,
        }
        return Reduce(t.id, update, build_order(ex, close_side, ex.commission))

    if ex.quantity == t.total_quantity:  # CLOSE
        actual_r = calc_actual_r(new_realized, t.avg_entry_price, t.stop_price, t.total_quantity_opened)
        return Close(
            t.id,
            closed_update(ex, new_realized, new_commission, actual_r),
            build_order(ex, close_side, ex.commission),
        )

    # REVERSAL: close the whole position, open the remainder on the other side
    closing_qty = t.total_quantity
    new_qty = ex.quantity - closing_qty
    closing_comm = ex.commission * (closing_qty / ex.quantity)
    opening_comm = ex.commission * (new_qty / ex.quantity)

    closing_pnl = calc_pnl(t.direction, t.avg_entry_price, ex.price, closing_qty)
    closed_realized = t.realized_pnl + closing_pnl - closing_comm
    actual_r = calc_actual_r(closed_realized, t.avg_entry_price, t.stop_price, t.total_quantity_opened)

    closing_ex = replace(ex, quantity=closing_qty)
    opening_ex = replace(ex, quantity=new_qty)
    new_direction: Direction = "Short" if is_long else "Long"
    return Reversal(
        close=Close(
            t.id,
            closed_update(ex, closed_realized, t.total_commission + closing_comm, actual_r),
            build_order(closing_ex, close_side, closing_comm),
        ),
        open=Open(
            build_trade(opening_ex, new_direction, new_qty, opening_comm),
            build_order(opening_ex, close_side, opening_comm),
        ),
    )`,
        },
        {
          kind: 'text',
          body: 'מי שמקבל `FifoAction` צריך לדעת איזו פעולה קיבל. ב-TS עושים `switch (action.type)`, ובפייתון 3.10 ומעלה יש **`match`**: כל `case` הוא **תבנית**. `case Open():` מתאים לכל מופע של `Open`; `case Close(trade_update=u):` גם בודק את הסוג וגם שולף שדה למשתנה `u`; `|` מאחד שתי תבניות; ותבנית dict כמו `{"result": result}` שולפת מפתח מתוך dict. `case _:` תופס כל מה שלא התאים — כמו `default`.',
        },
        {
          kind: 'compare',
          left: {
            lang: 'ts',
            title: 'TypeScript: switch על discriminant',
            code: `function label(action: FifoAction): string {
  switch (action.type) {
    case 'OPEN':
      return 'OPEN'
    case 'SCALE_IN':
    case 'REDUCE':
      return 'ADJUST'
    case 'CLOSE':
      return 'CLOSE (' + action.tradeUpdate.result + ')'
    case 'REVERSAL':
      return 'REVERSAL'
  }
}`,
          },
          right: {
            lang: 'python',
            title: 'Python: match על המחלקה',
            code: `from typing import assert_never


def label(action: FifoAction) -> str:
    match action:
        case Open():
            return "OPEN"
        case ScaleIn() | Reduce():
            return "ADJUST"
        case Close(trade_update={"result": result}):
            return f"CLOSE ({result})"
        case Reversal():
            return "REVERSAL"
        case _:
            assert_never(action)`,
          },
        },
        {
          kind: 'callout',
          tone: 'tip',
          body: '`assert_never` (מ-`typing`, פייתון 3.11+) הוא המקבילה של בדיקת exhaustiveness ב-TS: אם תוסיפו מחלקה חדשה ל-`FifoAction` ותשכחו `case` בשבילה, mypy או pyright יתריעו כבר בעריכה. ובזמן ריצה הוא זורק שגיאה במקום להמשיך בשקט.',
        },
        {
          kind: 'quiz',
          question: 'פוזיציית Long פתוחה של 100 מניות. מגיע ביצוע `SELL` של 150 מניות עם עמלה `3`. איזו פעולה מוחזרת, וכמה עמלה נרשמת על פקודת הסגירה?',
          options: ['`Reduce`, עמלה `3`', '`Close`, עמלה `3`', '`Reversal`, עמלה `2`', '`Reversal`, עמלה `1.5`'],
          answer: 2,
          explanation: 'הכמות (150) גדולה מהפוזיציה (100), ולכן זה Reversal: סוגרים 100 ופותחים Short של 50. העמלה מתחלקת לפי הכמויות: `3 * 100 / 150 = 2` לסגירה ו-`3 * 50 / 150 = 1` לפתיחה.',
        },
        {
          kind: 'quiz',
          question: 'מה קורה ב-`match` כשאף `case` לא מתאים ואין `case _`?',
          options: ['נזרקת שגיאה', 'לא קורה כלום — הקוד ממשיך אחרי ה-`match`', 'שגיאת תחביר כבר בטעינת הקובץ', 'ה-`case` הראשון רץ'],
          answer: 1,
          explanation: 'בשונה משפות שבהן `match` חייב לכסות הכל, בפייתון הוא פשוט לא עושה כלום. בפונקציה שאמורה להחזיר ערך זה אומר שהיא תחזיר `None` בשקט — ובגלל זה כדאי לסיים ב-`case _: assert_never(...)`.',
        },
        {
          kind: 'source',
          title: 'applyAction — המקור לתרגיל',
          ref: { file: 'lib/trade/guard-position-mutations.ts', start: 'switch (action.type) {' },
          notes: [
            { match: "case 'REDUCE': {", text: 'שני `case` ברצף בלי `return` ביניהם — "נפילה" ל-case הבא. בפייתון כותבים את זה כ-`case ScaleIn(trade_update=u) | Reduce(trade_update=u):`.' },
            { match: 'u.avgEntryPrice ?? snapshot.avgEntryPrice', text: 'שדה שלא קיים ב-update נשאר כמו ב-snapshot. ב-TypedDict: `u.get("avg_entry_price", snapshot.avg_entry_price)`.' },
          ],
        },
        {
          kind: 'exercise',
          prompt: 'תרגמו את `applyAction` לפייתון: `apply_action(snapshot, action)` מקבלת `OpenTrade | None` ו-`FifoAction`, ומחזירה את ה-snapshot אחרי הפעולה (או `None` אחרי סגירה). כתבו גם `from_trade_create(t)` שבונה `OpenTrade` עם `id=""`. בדקו אותה על רצף: קנייה של 100, הוספה של 50, מכירה של 30, ומכירה של 200 (היפוך ל-Short).',
          hint: 'השתמשו ב-`match` עם `case ScaleIn(trade_update=u) | Reduce(trade_update=u):`, ב-`dataclasses.replace` לעדכון ה-snapshot, וב-`u.get(key, default)` במקום `??`.',
          solution: {
            lang: 'python',
            code: `from dataclasses import replace
from datetime import datetime
from typing import assert_never


def from_trade_create(t: TradeCreate) -> OpenTrade:
    return OpenTrade(
        id="",
        direction=t.direction,
        avg_entry_price=t.avg_entry_price,
        total_quantity=t.total_quantity,
        total_quantity_opened=t.total_quantity_opened,
        total_commission=t.total_commission,
        realized_pnl=t.realized_pnl,
        opened_at=t.opened_at,
        stop_price=t.stop_price,
    )


def apply_action(snapshot: OpenTrade | None, action: FifoAction) -> OpenTrade | None:
    match action:
        case Open(trade_create=tc):
            return from_trade_create(tc)
        case Close():
            return None
        case Reversal(open=new_leg):
            return from_trade_create(new_leg.trade_create)
        case ScaleIn(trade_update=u) | Reduce(trade_update=u):
            if snapshot is None:
                return snapshot
            return replace(
                snapshot,
                avg_entry_price=u.get("avg_entry_price", snapshot.avg_entry_price),
                total_quantity=u.get("total_quantity", snapshot.total_quantity),
                total_quantity_opened=u.get("total_quantity_opened", snapshot.total_quantity_opened),
                total_commission=u.get("total_commission", snapshot.total_commission),
                realized_pnl=u.get("realized_pnl", snapshot.realized_pnl),
            )
        case _:
            assert_never(action)


now = datetime(2026, 4, 23, 14, 30)
legs = [
    Execution("E1", "AAPL", "BUY", 100, 100, 1, now),
    Execution("E2", "AAPL", "BUY", 50, 110, 1, now),
    Execution("E3", "AAPL", "SELL", 30, 120, 1, now),
    Execution("E4", "AAPL", "SELL", 200, 115, 2, now),
]
snap = None
for leg in legs:
    action = match_execution(leg, snap)
    snap = apply_action(snap, action)
    assert snap is not None  # none of these legs closes the position
    print(type(action).__name__, snap.direction, snap.total_quantity, round(snap.realized_pnl, 2))
# Open Long 100 -1
# ScaleIn Long 150 -2
# Reduce Long 120 497.0
# Reversal Short 80 -0.8`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    {
      slug: 'python-testing-pytest',
      title: 'בדיקות עם pytest',
      summary: 'כותבים לפורט את אותן בדיקות שיש ב-`__tests__/fifo.test.ts`: `assert` פשוט, `pytest.approx` לחישובי כסף ב-float, ו-`parametrize`.',
      minutes: 20,
      blocks: [
        {
          kind: 'text',
          body: 'הפורט מהשיעור הקודם קיפל את חצאי ה-Long וה-Short לאחד — ובלי בדיקות אין לנו שום הוכחה שהמספרים לא השתנו. ל-`matchExecution` כבר יש בדיקות Vitest באתר, אז פשוט נכתוב את אותם מקרים בדיוק ב-**pytest**.\n\nההבדלים מ-Vitest קטנים:\n\n- קובץ בדיקות נקרא `test_*.py`, וכל פונקציה ששמה מתחיל ב-`test_` היא בדיקה. אין `describe` ו-`it`.\n- במקום `expect(x).toBe(y)` כותבים `assert x == y`. כשהבדיקה נכשלת, pytest מציג את שני הצדדים בעצמו.\n- מריצים עם `python -m pytest` מתוך התיקייה של הפרויקט (אחרי שה-venv פעיל).',
        },
        {
          kind: 'source',
          title: 'פונקציית העזר בבדיקות של האתר',
          ref: { file: '__tests__/fifo.test.ts', start: 'function exec(overrides' },
          notes: [
            { match: '...overrides,', text: 'ערכי ברירת מחדל + דריסה של מה שהבדיקה צריכה. בפייתון: `replace(BASE_EXEC, **overrides)` — `**` פורש dict לארגומנטים בשם, ו-`**overrides` בחתימה אוסף אותם.' },
          ],
        },
        {
          kind: 'snippet',
          lang: 'python',
          title: 'test_fifo.py — חלק 1: עזרים',
          code: `from dataclasses import replace
from datetime import datetime, timezone

import pytest

from fifo import (
    Close, Execution, Open, OpenTrade, Reduce, Reversal,
    calc_actual_r, match_execution, result_from_r,
)

NOW = datetime(2026, 4, 23, 14, 30, tzinfo=timezone.utc)

BASE_EXEC = Execution(
    broker_exec_id="EXEC-001", ticker="AAPL", side="BUY",
    quantity=100, price=150, commission=1, executed_at=NOW,
)

BASE_LONG = OpenTrade(
    id="trade-1", direction="Long", avg_entry_price=140,
    total_quantity=100, total_quantity_opened=100, total_commission=1,
    realized_pnl=0, opened_at=NOW, stop_price=130,
)


def make_exec(**overrides) -> Execution:
    return replace(BASE_EXEC, **overrides)


def open_long(**overrides) -> OpenTrade:
    return replace(BASE_LONG, **overrides)`,
        },
        {
          kind: 'source',
          title: 'בדיקה מקורית: צמצום חלקי',
          ref: { file: '__tests__/fifo.test.ts', start: 'partial reduce: SELL 50 of 100' },
          notes: [
            { match: "if (result.type !== 'REDUCE') return", text: 'narrowing: אחרי השורה הזו TS יודע ש-`result` הוא REDUCE ומאפשר לגשת ל-`tradeUpdate`.' },
            { match: 'toBeCloseTo(499, 6)', text: 'השוואת float עם סובלנות. ב-pytest זה `pytest.approx`.' },
          ],
        },
        {
          kind: 'compare',
          left: {
            lang: 'ts',
            title: 'Vitest',
            code: `it('partial reduce: SELL 50 of 100 → REDUCE', () => {
  const trade = openLong({ avgEntryPrice: 140 })
  const result = matchExecution(exec({ side: 'SELL', quantity: 50, price: 150, commission: 1 }), trade)
  expect(result.type).toBe('REDUCE')
  if (result.type !== 'REDUCE') return
  expect(result.tradeUpdate.totalQuantity).toBe(50)
  expect(result.tradeUpdate.realizedPnl).toBeCloseTo(499, 6)
  expect(result.tradeUpdate.totalCommission).toBeCloseTo(2, 6)
})`,
          },
          right: {
            lang: 'python',
            title: 'pytest',
            code: `def test_partial_reduce_realizes_pnl_for_sold_shares():
    action = match_execution(make_exec(side="SELL", quantity=50, price=150), open_long())
    assert isinstance(action, Reduce)
    assert action.trade_update["total_quantity"] == 50
    assert action.trade_update["realized_pnl"] == pytest.approx(499)
    assert action.trade_update["total_commission"] == pytest.approx(2)`,
          },
        },
        {
          kind: 'text',
          body: '`assert isinstance(action, Reduce)` עושה את שתי העבודות של הצמד `expect(...).toBe(\'REDUCE\')` + `if (...) return`: הבדיקה נכשלת עם הודעה ברורה אם הסוג שגוי, וה-type checker יודע מכאן והלאה ש-`action` הוא `Reduce`.\n\nולמה `pytest.approx`? כי `0.1 + 0.2` במחשב הוא `0.30000000000000004`. בחישובי עמלות — `4 * 75 / 100`, ממוצעים משוקללים — שאריות כאלה הן עניין של זמן. `pytest.approx(x)` משווה עם סובלנות **יחסית** של מיליונית (`1e-6`), ועם סובלנות **מוחלטת** זעירה של `1e-12` בלבד. זה שונה מ-`toBeCloseTo(x, 6)` של Vitest, שהיא מוחלטת: `0.0000005`.',
        },
        {
          kind: 'snippet',
          lang: 'python',
          title: 'approx — נסו ב-REPL',
          code: `import pytest

0.1 + 0.2 == 0.3                       # False
0.1 + 0.2 == pytest.approx(0.3)        # True
998.0000001 == pytest.approx(998)      # True  - relative tolerance 1e-6
1e-9 == pytest.approx(0)               # False - near zero only abs=1e-12 applies
1e-9 == pytest.approx(0, abs=1e-6)     # True`,
        },
        {
          kind: 'text',
          body: 'שאר הבדיקות. שלוש בדיקות ה-TS של "סגירה בלי סטופ" (Win, Loss, Breakeven) הופכות לבדיקה אחת עם `@pytest.mark.parametrize`: כל tuple ברשימה הופך להרצה נפרדת עם הערכים שלו.',
        },
        {
          kind: 'snippet',
          lang: 'python',
          title: 'test_fifo.py — חלק 2: הבדיקות',
          code: `def test_buy_with_no_open_trade_opens_long():
    action = match_execution(make_exec(side="BUY"), None)
    assert isinstance(action, Open)
    assert action.trade_create.direction == "Long"
    assert action.trade_create.realized_pnl == pytest.approx(-1)  # opening commission
    assert action.order_create.side == "BUY"


def test_sshort_with_no_open_trade_opens_short_and_stores_sell():
    action = match_execution(make_exec(side="SSHORT", price=160), None)
    assert isinstance(action, Open)
    assert action.trade_create.direction == "Short"
    assert action.order_create.side == "SELL"


def test_full_close_sets_actual_r_and_win():
    action = match_execution(make_exec(side="SELL", quantity=100, price=150), open_long())
    assert isinstance(action, Close)
    u = action.trade_update
    assert u["status"] == "Closed"
    assert u["realized_pnl"] == pytest.approx(999)
    assert u["actual_r"] == pytest.approx(999 / (10 * 100))
    assert u["result"] == "Win"


@pytest.mark.parametrize(
    ("exit_price", "commission", "avg_entry", "expected"),
    [
        (150, 1, 140, "Win"),        # +999, no stop -> classified by money
        (135, 1, 140, "Loss"),       # -501
        (150, 0, 150, "Breakeven"),  # exactly 0
    ],
)
def test_stopless_close_falls_back_to_money(exit_price, commission, avg_entry, expected):
    trade = open_long(avg_entry_price=avg_entry, stop_price=None, total_commission=0)
    action = match_execution(make_exec(side="SELL", price=exit_price, commission=commission), trade)
    assert isinstance(action, Close)
    assert action.trade_update["actual_r"] is None
    assert action.trade_update["result"] == expected


def test_reversal_splits_commission_3_to_1():
    trade = open_long(total_quantity=75)
    action = match_execution(make_exec(side="SELL", quantity=100, commission=4), trade)
    assert isinstance(action, Reversal)
    assert action.close.order_create.quantity == 75
    assert action.close.order_create.commission == pytest.approx(3)
    assert action.open.order_create.commission == pytest.approx(1)
    assert action.open.trade_create.direction == "Short"


def test_open_then_close_includes_both_commissions():
    opened = match_execution(make_exec(side="BUY", price=100), None)
    assert isinstance(opened, Open)
    snap = open_long(avg_entry_price=100, stop_price=90,
                     realized_pnl=opened.trade_create.realized_pnl)
    closed = match_execution(make_exec(side="SELL", price=110, broker_exec_id="E2"), snap)
    assert isinstance(closed, Close)
    assert closed.trade_update["realized_pnl"] == pytest.approx(998)  # 1000 - 1 - 1
    assert closed.trade_update["actual_r"] == pytest.approx(998 / (10 * 100))


def test_tiny_stop_distance_gives_no_r():
    assert calc_actual_r(1000, 100, 100 + 0.00001, 100) is None


def test_zero_r_is_breakeven_not_loss():
    assert result_from_r(0.0, -3) == "Breakeven"`,
        },
        {
          kind: 'snippet',
          lang: 'bash',
          title: 'הרצה',
          code: `python -m pytest -q              # quiet: one dot per passing test
# ...........                                         [100%]
# 11 passed in 0.05s

python -m pytest -v              # one line per test, including each parametrize case
python -m pytest -k reversal     # only tests whose name contains "reversal"
python -m pytest -x              # stop at the first failure`,
        },
        {
          kind: 'quiz',
          question: 'אחרי חישוב, `realized_pnl` יצא `1e-9` במקום `0` בגלל שארית float. איזו בדיקה **עוברת**?',
          options: ['`assert realized_pnl == 0`', '`assert realized_pnl == pytest.approx(0)`', '`assert realized_pnl == pytest.approx(0, abs=1e-6)`', 'אף אחת מהן'],
          answer: 2,
          explanation: 'סובלנות יחסית של `0` היא `0`, ולכן ליד אפס `approx` נשען רק על הסובלנות המוחלטת — `1e-12` כברירת מחדל, קטנה מ-`1e-9`. כשמשווים לאפס צריך לתת `abs` במפורש.',
        },
        {
          kind: 'quiz',
          question: 'בדיקה עם `@pytest.mark.parametrize` ורשימה של שלושה tuples. מה pytest מדווח?',
          options: ['בדיקה אחת, שנכשלת כולה אם אחד המקרים נכשל', 'שלוש בדיקות נפרדות, לכל אחת תוצאה משלה', 'שגיאה — צריך לולאת `for` בתוך הבדיקה', 'רק המקרה הראשון רץ'],
          answer: 1,
          explanation: 'כל tuple הופך לבדיקה עצמאית עם מזהה משלו (למשל `test_stopless_close_falls_back_to_money[135-1-140-Loss]`). אם רק Loss נכשל, רואים בדיוק איזה מקרה — מה שלולאה בתוך בדיקה אחת לא נותנת.',
        },
        {
          kind: 'exercise',
          prompt: 'הוסיפו בדיקה לפי `short→long: BUY 200 on 100 short` מ-`__tests__/fifo.test.ts`: פוזיציית Short של 100 מניות במחיר כניסה 160 וסטופ 170, וביצוע BUY של 200 במחיר 150 עם עמלה 2. בדקו שזו `Reversal`, שהטרייד הישן נסגר עם רווח ממומש של 999, ושנפתח Long של 100 עם `realized_pnl` של `-1`.',
          hint: 'בנו `open_short` באותה צורה כמו `open_long` — `replace(BASE_LONG, direction="Short", ...)`. הרווח על 100 המניות הנסגרות: `(160 - 150) * 100` פחות חצי מהעמלה.',
          solution: {
            lang: 'python',
            code: `def open_short(**overrides) -> OpenTrade:
    base = replace(BASE_LONG, id="trade-2", direction="Short", avg_entry_price=160, stop_price=170)
    return replace(base, **overrides)


def test_reversal_short_to_long():
    action = match_execution(make_exec(side="BUY", quantity=200, price=150, commission=2), open_short())
    assert isinstance(action, Reversal)

    closed = action.close.trade_update
    assert closed["status"] == "Closed"
    assert closed["realized_pnl"] == pytest.approx(999)   # (160 - 150) * 100 - 1
    assert closed["result"] == "Win"

    opened = action.open.trade_create
    assert opened.direction == "Long"
    assert opened.total_quantity == 100
    assert opened.realized_pnl == pytest.approx(-1)       # the other half of the commission`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    {
      slug: 'python-pandas-analysis',
      title: 'ניתוח טריידים עם pandas',
      summary: 'טוענים CSV של טריידים סגורים ומחשבים win rate, ממוצע R, expectancy, profit factor ו-`groupby` לפי טיקר — לפי אותן הגדרות של `calcStats` ו-`computeResearchAggregates`.',
      minutes: 25,
      blocks: [
        {
          kind: 'text',
          body: '**pandas** היא הספרייה לעבודה עם טבלאות בפייתון. `DataFrame` הוא טבלה, ו-`Series` הוא עמודה אחת. במקום לולאות כותבים פעולות על עמודות שלמות: `df["realized_pnl"] > 0` מחזיר עמודה של `True`/`False` בבת אחת.\n\nהמטרה כאן היא לא "סטטיסטיקה כללית", אלא לקבל **את אותם מספרים שמסך התחקור מציג**. האתר מחשב אותם ב-`computeResearchAggregates` (מעבר יחיד על כל הטריידים), ובדיקת golden מוודאת שהתוצאה זהה לפונקציות הייחוס ב-`calculations.ts`. אם ההגדרות שלנו יהיו שונות — הנתונים יסתרו את הדשבורד.\n\nקודם, קובץ לדוגמה (תא ריק ב-`actual_r` = טרייד בלי סטופ):',
        },
        {
          kind: 'snippet',
          lang: 'bash',
          title: 'יצירת trades.csv מ-Git Bash',
          code: `cat > trades.csv <<'EOF'
ticker,direction,opened_at,closed_at,realized_pnl,actual_r,result
AAPL,Long,2026-03-02T14:35:00Z,2026-03-02T19:10:00Z,998,0.998,Win
TSLA,Short,2026-03-03T15:00:00Z,2026-03-04T16:20:00Z,-501,-1.002,Loss
AAPL,Long,2026-03-05T14:40:00Z,2026-03-05T20:55:00Z,-1501,-1.5,Loss
NVDA,Long,2026-03-06T14:31:00Z,2026-03-09T18:00:00Z,2400,2.4,Win
TSLA,Long,2026-03-10T13:45:00Z,2026-03-10T15:30:00Z,350,,Win
NVDA,Short,2026-03-11T14:50:00Z,2026-03-11T19:40:00Z,0,0,Breakeven
AAPL,Long,2026-03-12T14:32:00Z,2026-03-13T15:05:00Z,-220,,Loss
NVDA,Long,2026-03-16T14:33:00Z,2026-03-17T19:00:00Z,1210,1.21,Win
EOF`,
        },
        {
          kind: 'source',
          title: 'המעבר היחיד — מי נספר איפה',
          ref: { file: 'lib/utils/research-aggregate.ts', start: 'totalPnl += pnl', end: 'rCount++' },
          notes: [
            { match: 'if (pnl > 0) {', text: 'מנצח = **כסף** חיובי — לא העמודה `result`. טרייד Breakeven (בדיוק 0) נספר במכנה של win rate אבל לא כמנצח וגם לא כמפסיד.' },
            { match: 'grossLossUsd += -pnl', text: 'ההפסד הגולמי נצבר כערך מוחלט — זה המכנה של profit factor.' },
            { match: 'rSum += r', text: 'R נצבר רק לטריידים עם `actualR` שאינו null. טרייד בלי סטופ נכנס ל-win rate ול-PnL, אבל לא לממוצע ה-R.' },
          ],
        },
        {
          kind: 'source',
          title: 'הרכבת המדדים',
          ref: { file: 'lib/utils/research-aggregate.ts', start: 'const winRate = winnersCount / trades.length', end: 'const avgR = rCount > 0' },
          notes: [
            { match: '999', text: 'אין אף הפסד → profit factor הוא `999`, לא אינסוף ולא שגיאה.' },
            { match: 'rCount > 0 ? rSum / rCount : 0', text: 'אין אף טרייד עם R → `0`. ב-pandas ממוצע של עמודה ריקה הוא `NaN`, אז צריך לטפל בזה במפורש.' },
          ],
        },
        {
          kind: 'snippet',
          lang: 'python',
          title: 'kpis.py',
          code: `import pandas as pd

df = pd.read_csv("trades.csv", parse_dates=["opened_at", "closed_at"])
# df.shape == (8, 7); empty actual_r cells become NaN, so the column is float64

pnl = df["realized_pnl"]
wins = pnl[pnl > 0]                  # boolean mask -> only the matching rows
losses = pnl[pnl < 0]

win_rate = len(wins) / len(df)       # Breakeven stays in the denominator
gross_loss = losses.abs().sum()
profit_factor = 999 if gross_loss == 0 else wins.sum() / gross_loss
avg_win = wins.mean() if len(wins) else 0.0
avg_loss = losses.mean() if len(losses) else 0.0   # negative, like the site
r = df["actual_r"].dropna()          # only trades that had a stop
avg_r = r.mean() if len(r) else 0.0
expectancy = avg_r                   # the site's definition: mean R

print(f"trades {len(df)} | win rate {win_rate:.1%} | total pnl {pnl.sum():,.0f}")
print(f"PF {profit_factor:.2f} | avg win {avg_win:.2f} | avg loss {avg_loss:.2f}")
print(f"avg R {avg_r:.3f} over {len(r)} trades | expectancy {expectancy:.3f}R")
# trades 8 | win rate 50.0% | total pnl 2,736
# PF 2.23 | avg win 1239.50 | avg loss -740.67
# avg R 0.351 over 6 trades | expectancy 0.351R`,
        },
        {
          kind: 'text',
          body: 'כמה דברים ששווה לשים לב אליהם:\n\n- `pnl[pnl > 0]` הוא **boolean mask** — המקבילה של `filter`, על כל העמודה בבת אחת.\n- `.mean()` מדלג על `NaN` כברירת מחדל (`skipna=True`), ולכן `df["actual_r"].mean()` כבר שווה ל-`avgR` של האתר. ה-`dropna()` כאן הוא בשביל `len(r)` — מספר הטריידים עם R (`rTradeCount`).\n- הטעות הנפוצה היא `fillna(0)`: היא הופכת "אין סטופ" ל-"R של אפס" ומורידה את הממוצע ל-`0.263` במקום `0.351`.\n\nאת המספרים האלה הרצנו גם דרך `calcStats` של האתר על אותו קובץ — כולם זהים.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'באתר, **expectancy הוא פשוט ממוצע ה-R** (`expectancy: avgR`), על הטריידים עם סטופ בלבד. בספרים תמצאו גם את הנוסחה `win_rate * avg_win + (1 - win_rate) * avg_loss` — היא נמדדת בדולרים, כוללת את כל הטריידים, ונותנת מספר אחר לגמרי. אם משווים לדשבורד, משתמשים בהגדרה של האתר.',
        },
        {
          kind: 'quiz',
          question: 'מוסיפים לקובץ טרייד אחד עם `realized_pnl = 0` ו-`actual_r = 0`. מה קורה ל-win rate ולממוצע ה-R?',
          options: ['שניהם לא משתנים', 'win rate יורד, ממוצע ה-R זז לכיוון 0', 'win rate עולה, ממוצע ה-R לא משתנה', 'הטרייד לא נספר בכלל, כי הוא Breakeven'],
          answer: 1,
          explanation: 'הטרייד נכנס למכנה של win rate (`len(df)`) אבל לא למונה (`pnl > 0`), ולכן win rate יורד. יש לו R, אז הוא נכנס גם לממוצע ה-R ומושך אותו לכיוון 0. רק `actual_r` ריק (NaN) היה מוציא אותו מממוצע ה-R.',
        },
        {
          kind: 'source',
          title: 'pnlByTicker — הקיבוץ לפי טיקר',
          ref: { file: 'lib/utils/research-charts.ts', start: 'export function pnlByTicker(' },
          notes: [
            { match: 'if (t.realizedPnl == null) continue', text: 'שורות בלי PnL לא נספרות. ב-pandas: `df.dropna(subset=["realized_pnl"])` לפני הקיבוץ.' },
            { match: "t.result === 'Win'", text: 'כאן מנצח נקבע לפי `result` ולא לפי `realizedPnl > 0` כמו ב-win rate הכללי. בפועל זה יוצא אותו דבר, כי `actualR` תמיד באותו סימן כמו `realizedPnl` — אבל בפורט שומרים על ההגדרה המקורית.' },
            { match: '.sort((a, b) => b.totalPnl - a.totalPnl)', text: 'מיון יורד. ב-pandas: `sort_values("total_pnl", ascending=False)`.' },
          ],
        },
        {
          kind: 'snippet',
          lang: 'python',
          title: 'groupby("ticker")',
          code: `by_ticker = (
    df.dropna(subset=["realized_pnl"])
    .groupby("ticker")
    .agg(
        total_pnl=("realized_pnl", "sum"),
        trade_count=("realized_pnl", "size"),
        win_rate=("result", lambda s: (s == "Win").mean()),
    )
    .sort_values("total_pnl", ascending=False)
)
print(by_ticker)
#         total_pnl  trade_count  win_rate
# ticker
# NVDA         3610            3  0.666667
# TSLA         -151            2  0.500000
# AAPL         -723            3  0.333333`,
        },
        {
          kind: 'quiz',
          question: 'איזה ביטוי נותן בדיוק את `avgR` של האתר (בהנחה שיש לפחות טרייד אחד עם R)?',
          options: ['`df["actual_r"].mean()`', '`df["actual_r"].fillna(0).mean()`', '`df["actual_r"].sum() / len(df)`', '`df["realized_pnl"].mean()`'],
          answer: 0,
          explanation: '`.mean()` מתעלם מ-NaN, כלומר מחשב רק על טריידים עם R — בדיוק כמו `rSum / rCount`. שתי האפשרויות הבאות מחלקות במספר **כל** הטריידים ומקטינות את הממוצע (`0.263` בקובץ שלנו).',
        },
        {
          kind: 'source',
          title: 'max drawdown — המקור לתרגיל',
          ref: { file: 'lib/utils/calculations.ts', start: 'const sortedByClose', end: 'if (dd < maxDrawdown) maxDrawdown = dd' },
          notes: [
            { match: 'let peak = 0', text: 'השיא מתחיל ב-0, לא בטרייד הראשון — הפסד כבר בטרייד הראשון נחשב drawdown מהנקודה ההתחלתית.' },
          ],
        },
        {
          kind: 'exercise',
          prompt: 'כתבו `max_drawdown(trades: pd.DataFrame) -> float` שמחשבת את אותו מספר כמו הלולאה שלמעלה — בלי לולאה. על הקובץ שלנו התוצאה צריכה להיות `-2002.0`, ועל DataFrame ריק `0.0`.',
          hint: 'מיינו לפי `closed_at`, ואז `cumsum()` לרווח המצטבר ו-`cummax()` לשיא המצטבר. שימו לב שהשיא באתר לא יורד מתחת ל-0 — `clip(lower=0)`.',
          solution: {
            lang: 'python',
            code: `import pandas as pd


def max_drawdown(trades: pd.DataFrame) -> float:
    if trades.empty:
        return 0.0
    cum = trades.sort_values("closed_at")["realized_pnl"].cumsum()
    peak = cum.cummax().clip(lower=0)      # the site's peak starts at 0
    return float((cum - peak).min())       # always <= 0, because peak >= cum


df = pd.read_csv("trades.csv", parse_dates=["opened_at", "closed_at"])
print(max_drawdown(df))            # -2002.0
print(max_drawdown(df.iloc[0:0]))  # 0.0`,
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    {
      slug: 'python-files-and-scripts',
      title: 'קבצים וסקריפטים: תאריכי IBKR',
      summary: '`pathlib`, `csv`, `json`, `argparse` ו-`if __name__ == "__main__"` — סקריפט שממיר תאריכי IBKR ל-UTC בדיוק כמו `parseIbkrDate`, הפונקציה שהאתר השתמש בה בתקופת Flex.',
      minutes: 25,
      blocks: [
        {
          kind: 'text',
          body: 'IBKR שולחת תאריכים בפורמט `dd/MM/yyyy;HH:mm:ss TZ` — למשל `23/04/2026;14:30:00 EST`. האתר לא נותן לאף ספרייה לנחש מה זה: הוא מפרק את המחרוזת ידנית, מוצא את ההיסט של אזור הזמן בטבלה, ובונה את הרגע ב-UTC. בשיעור הזה נכתוב סקריפט פייתון שעושה את אותו הדבר לעמודה שלמה בקובץ CSV — ובדרך נכיר קבצים, `csv`, `json` ו-`argparse`.',
        },
        {
          kind: 'snippet',
          lang: 'ts',
          title: 'טבלת ההיסטים',
          code: `const TZ_OFFSETS_MINUTES: Record<string, number> = {
  EST: -300,
  EDT: -240,
  CST: -360,
  CDT: -300,
  PST: -480,
  PDT: -420,
  UTC: 0,
}`,
        },
        {
          kind: 'text',
          body: "- היסט בדקות מ-UTC: EST הוא UTC פחות 5 שעות. EDT (שעון קיץ) הוא פחות 4 — שני הקיצורים מגיעים מ-IBKR, ולכן אין צורך לחשב שעון קיץ בעצמנו.",
        },
        {
          kind: 'text',
          body: 'למה לא פשוט `strptime`, המקבילה הפייתונית של `date-fns parse()`? כי יש שתי בעיות, בדיוק כמו ב-JS:\n\n- `%Z` ב-`strptime` מקבל רק `UTC`, `GMT` ואת שמות אזור הזמן **של המחשב עצמו**. על מחשב בישראל `EST` נכשל.\n- גם כשהפענוח מצליח, מקבלים datetime **naive** — בלי אזור זמן בכלל. כל חישוב עליו מניח את השעון המקומי של המחשב, וזה בדיוק הבאג ש-`date-fns parse()` יוצר: אותה מחרוזת נותנת רגע אחר על כל שרת.',
        },
        {
          kind: 'snippet',
          lang: 'python',
          title: 'הדרך השגויה',
          code: `from datetime import datetime

datetime.strptime("23/04/2026;14:30:00 EST", "%d/%m/%Y;%H:%M:%S %Z")
# ValueError: time data '23/04/2026;14:30:00 EST' does not match format ...

naive = datetime.strptime("23/04/2026;14:30:00", "%d/%m/%Y;%H:%M:%S")
naive.tzinfo        # None - a "naive" datetime
naive.timestamp()   # interpreted in the MACHINE's zone: on a computer in Israel
                    # that is 11:30 UTC, while 14:30 EST is really 19:30 UTC`,
        },
        {
          kind: 'snippet',
          lang: 'ts',
          title: 'פירוק המחרוזת',
          code: `const semicolonIdx = raw.indexOf(';')
  if (semicolonIdx === -1) {
    console.error('[parseIbkrDate] missing semicolon separator:', raw)
    return null
  }

  const datePart = raw.slice(0, semicolonIdx).trim()
  const timeWithTz = raw.slice(semicolonIdx + 1).trim()

  // Split "HH:mm:ss TZ" on last space to isolate timezone abbreviation
  const lastSpace = timeWithTz.lastIndexOf(' ')
  if (lastSpace === -1) {
    console.error('[parseIbkrDate] missing timezone in time part:', raw)
    return null
  }

  const timePart = timeWithTz.slice(0, lastSpace).trim()
  const tzAbbrev = timeWithTz.slice(lastSpace + 1).trim().toUpperCase()`,
        },
        {
          kind: 'text',
          body: "- בפייתון: `raw.partition(\";\")` מחזיר tuple של (לפני, מפריד, אחרי). אם אין מפריד, האיבר האמצעי הוא מחרוזת ריקה.\n- `rpartition(\" \")` — אותו דבר, מהרווח האחרון.\n- `.strip().upper()` בפייתון.",
        },
        {
          kind: 'snippet',
          lang: 'ts',
          title: 'ההמרה ל-UTC',
          code: `// Date.UTC() treats all arguments as UTC — gives us the "wall clock as if UTC" timestamp.
  // Subtracting the timezone offset converts wall-clock-in-TZ → true UTC.
  // Example: 14:30:00 EST (offset=-300): wallClockUTC=14:30Z, utcMs=14:30Z+5h=19:30Z ✓
  const wallClockUtcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds)
  const utcMs = wallClockUtcMs - offsetMinutes * 60_000

  return new Date(utcMs)`,
        },
        {
          kind: 'text',
          body: "- בונים את השעה \"כאילו היא UTC\", ומחסירים את ההיסט. בפייתון: `datetime(..., tzinfo=timezone.utc) - timedelta(minutes=offset)`.",
        },
        {
          kind: 'snippet',
          lang: 'python',
          title: 'ibkr_dates.py — חלק 1: הפענוח',
          code: `"""Convert IBKR Flex date strings in a CSV column to UTC ISO timestamps."""
import argparse
import csv
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

TZ_OFFSETS_MINUTES = {
    "EST": -300, "EDT": -240,
    "CST": -360, "CDT": -300,
    "PST": -480, "PDT": -420,
    "UTC": 0,
}


def parse_ibkr_date(raw: str | None) -> datetime | None:
    """'23/04/2026;14:30:00 EST' -> aware UTC datetime, or None on bad input."""
    if raw is None or raw.strip() == "":
        return None

    date_part, sep, time_with_tz = raw.partition(";")
    if not sep:
        return None

    time_part, space, tz_abbrev = time_with_tz.strip().rpartition(" ")
    if not space:
        return None

    offset_minutes = TZ_OFFSETS_MINUTES.get(tz_abbrev.strip().upper())
    if offset_minutes is None:
        return None

    date_bits = date_part.strip().split("/")
    time_bits = time_part.strip().split(":")
    if len(date_bits) != 3 or len(time_bits) != 3:
        return None

    try:
        day, month, year = (int(x) for x in date_bits)
        hours, minutes, seconds = (int(x) for x in time_bits)
        wall_clock = datetime(year, month, day, hours, minutes, seconds, tzinfo=timezone.utc)
    except ValueError:  # not a number, or out of range (month 13, 31/02, hour 24 ...)
        return None

    return wall_clock - timedelta(minutes=offset_minutes)`,
        },
        {
          kind: 'callout',
          tone: 'warn',
          body: 'הפורט **קפדני יותר** מהמקור, וחשוב לדעת איפה. `datetime(2026, 2, 31)` זורק `ValueError`, ולכן `31/02/2026` מחזיר `None`; ב-TS הבדיקה היא רק `day <= 31`, ו-`Date.UTC` "מגלגל" את 31 בפברואר ל-3 במרץ. באותו אופן `int("14x")` נכשל, בעוד ש-`parseInt("14x", 10)` מחזיר `14`. כאן ההחמרה רצויה — אבל זה הבדל התנהגותי, ובפורט צריך לציין אותו ולא לגלות אותו בדיעבד.',
        },
        {
          kind: 'text',
          body: 'עכשיו החלק שהופך את הקובץ לסקריפט:\n\n- **`pathlib.Path`** מייצג נתיב קובץ, עם `.exists()`, `.open()`, `.read_text()` ו-`.write_text()`. עובד עם `/` גם ב-Windows.\n- **`with ... as f:`** פותח קובץ וסוגר אותו אוטומטית בסוף הבלוק, גם אם נזרקה שגיאה.\n- **`csv.DictReader`** קורא כל שורה כ-dict לפי הכותרות. את הקובץ פותחים עם `newline=""` — בלי זה, ב-Windows מופיעות שורות ריקות בכתיבה ושבירות שורה בתוך ערכים מתפרשות לא נכון.\n- **`argparse`** מפענח את הארגומנטים משורת הפקודה ומייצר `--help` לבד.\n- **`if __name__ == "__main__":`** — כשמריצים `python ibkr_dates.py`, הערך של `__name__` הוא `"__main__"`. כשקובץ אחר עושה `import ibkr_dates` הוא `"ibkr_dates"`, ו-`main()` לא רץ. כך אותו קובץ הוא גם סקריפט וגם מודול שאפשר לייבא ולבדוק.',
        },
        {
          kind: 'snippet',
          lang: 'python',
          title: 'ibkr_dates.py — חלק 2: הסקריפט',
          code: `def convert(src: Path, column: str) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    with src.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            parsed = parse_ibkr_date(row[column])
            row[column + "_utc"] = parsed.isoformat() if parsed else ""
            rows.append(row)
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Add a UTC column next to an IBKR date column.")
    parser.add_argument("csv_path", type=Path, help="input CSV file")
    parser.add_argument("--column", default="dateTime", help="column holding the IBKR date")
    parser.add_argument("--out", type=Path, help="write JSON here instead of stdout")
    args = parser.parse_args()

    if not args.csv_path.exists():
        print(f"file not found: {args.csv_path}", file=sys.stderr)
        return 1

    rows = convert(args.csv_path, args.column)
    bad = sum(1 for r in rows if not r[args.column + "_utc"])
    text = json.dumps(rows, indent=2, ensure_ascii=False)
    if args.out:
        args.out.write_text(text, encoding="utf-8")
        print(f"wrote {len(rows)} rows to {args.out} ({bad} unparseable)")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())`,
        },
        {
          kind: 'snippet',
          lang: 'bash',
          title: 'הרצה',
          code: `cat > executions.csv <<'EOF'
symbol,quantity,price,dateTime
AAPL,100,150.25,23/04/2026;14:30:00 EST
AAPL,-100,152.10,23/04/2026;15:45:10 EDT
TSLA,50,240.00,31/02/2026;10:00:00 EST
EOF

python ibkr_dates.py --help
python ibkr_dates.py executions.csv --out out.json
# wrote 3 rows to out.json (1 unparseable)
# out.json: "dateTime_utc": "2026-04-23T19:30:00+00:00" for the first row`,
        },
        {
          kind: 'quiz',
          question: 'קובץ `report.py` עושה `from ibkr_dates import parse_ibkr_date`. מה קורה ל-`main()` של `ibkr_dates.py`?',
          options: ['רץ פעם אחת בזמן ה-import', 'לא רץ, כי `__name__` הוא `"ibkr_dates"` ולא `"__main__"`', 'רץ בכל קריאה ל-`parse_ibkr_date`', 'ה-import נכשל, כי בקובץ יש `sys.exit`'],
          answer: 1,
          explanation: 'בזמן import, פייתון מריץ את כל הקובץ מלמעלה למטה — מגדיר פונקציות ומשתנים — אבל התנאי `__name__ == "__main__"` לא מתקיים, ולכן `main()` ו-`sys.exit` לא נקראים. בלי התנאי, ה-import היה מפעיל את argparse ויוצא מהתוכנית.',
        },
        {
          kind: 'quiz',
          question: 'מה מחזיר `parse_ibkr_date("23/04/2026;14:30:00 EDT")`?',
          options: ['`14:30` UTC', '`18:30` UTC', '`19:30` UTC', '`10:30` UTC'],
          answer: 1,
          explanation: 'ההיסט של EDT הוא `-240` דקות. `14:30 - (-240 דקות)` = `14:30 + 4 שעות` = `18:30` UTC. עם EST (`-300`) היה יוצא `19:30`.',
        },
        {
          kind: 'exercise',
          prompt: 'הוסיפו לסקריפט אפשרות `--format` עם הערכים `json` (ברירת מחדל) ו-`csv`. ב-`csv` הפלט נכתב עם `csv.DictWriter` לקובץ שב-`--out`, וחובה לתת `--out` (אחרת הודעת שגיאה של argparse). כתבו פונקציה `write_csv(rows, dest)` ו-`main()` מעודכן.',
          hint: '`parser.add_argument("--format", choices=["json", "csv"], default="json")`. ל-`DictWriter` צריך `fieldnames` — קחו את המפתחות של השורה הראשונה. ו-`parser.error(...)` מדפיס הודעה ויוצא עם קוד 2.',
          solution: {
            lang: 'python',
            code: `def write_csv(rows: list[dict[str, str]], dest: Path) -> None:
    with dest.open("w", newline="", encoding="utf-8") as f:
        if not rows:
            return
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Add a UTC column next to an IBKR date column.")
    parser.add_argument("csv_path", type=Path, help="input CSV file")
    parser.add_argument("--column", default="dateTime", help="column holding the IBKR date")
    parser.add_argument("--out", type=Path, help="output file")
    parser.add_argument("--format", choices=["json", "csv"], default="json")
    args = parser.parse_args()

    if args.format == "csv" and args.out is None:
        parser.error("--format csv requires --out")
    if not args.csv_path.exists():
        print(f"file not found: {args.csv_path}", file=sys.stderr)
        return 1

    rows = convert(args.csv_path, args.column)
    if args.format == "csv":
        write_csv(rows, args.out)
        print(f"wrote {len(rows)} rows to {args.out}")
    elif args.out:
        args.out.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"wrote {len(rows)} rows to {args.out}")
    else:
        print(json.dumps(rows, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())`,
          },
        },
      ],
    },
  ],
}
