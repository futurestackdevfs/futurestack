export type Lang = "python" | "java" | "csharp" | "playwright" | "cypress" | "robot";

export const LANGS: { id: Lang; label: string; hint: string }[] = [
  { id: "python", label: "Python", hint: "Selenium" },
  { id: "java", label: "Java", hint: "Selenium" },
  { id: "csharp", label: "C#", hint: "Selenium" },
  { id: "playwright", label: "Playwright", hint: "JavaScript" },
  { id: "cypress", label: "Cypress", hint: "JavaScript" },
  { id: "robot", label: "Robot", hint: "SeleniumLibrary" },
];

export type Action =
  | "open"
  | "type"
  | "click"
  | "dblclick"
  | "rightclick"
  | "hover"
  | "select"
  | "check"
  | "uncheck"
  | "upload"
  | "drag"
  | "waitVisible"
  | "waitText"
  | "acceptDialog"
  | "dismissDialog"
  | "promptDialog"
  | "assertText"
  | "assertValue"
  | "assertVisible"
  | "assertHidden"
  | "assertEnabled"
  | "assertDisabled"
  | "assertChecked"
  | "assertCount"
  | "assertAttr";

/** Reach into an iframe or a shadow root before applying `loc`. */
export interface Via {
  kind: "frame" | "shadow";
  host: string;
}

export interface Step {
  id: string;
  action: Action;
  loc?: string;
  value?: string;
  via?: Via;
  timeout?: number;
  label: string;
  hint?: string;
}

export interface TestCase {
  id: string;
  title: string;
  description: string;
  steps: Step[];
}

export interface PageElement {
  name: string;
  locator: string;
  note: string;
}

export interface Challenge {
  id: string;
  title: string;
  section: string;
  difficulty: "Easy" | "Medium" | "Hard";
  summary: string;
  elements: PageElement[];
  tips: string[];
  /** The defect injected when "Inject bug" mode is on. */
  bug: { title: string; detail: string };
  tests: TestCase[];
}

/* ───────────── builders ───────────── */

interface StepOpts {
  via?: Via;
  timeout?: number;
  hint?: string;
  label?: string;
}
type Draft = Omit<Step, "id">;

const q = (s?: string) => (s === undefined ? "" : `"${s}"`);

function labelFor(action: Action, loc?: string, value?: string): string {
  switch (action) {
    case "open":
      return "Open the page";
    case "type":
      return `Type ${q(value)} into ${loc}`;
    case "click":
      return `Click ${loc}`;
    case "dblclick":
      return `Double-click ${loc}`;
    case "rightclick":
      return `Right-click ${loc}`;
    case "hover":
      return `Hover over ${loc}`;
    case "select":
      return `Select ${q(value)} in ${loc}`;
    case "check":
      return `Tick ${loc}`;
    case "uncheck":
      return `Untick ${loc}`;
    case "upload":
      return `Upload ${q(value)} to ${loc}`;
    case "drag":
      return `Drag ${loc} onto ${value}`;
    case "waitVisible":
      return `Wait until ${loc} is visible`;
    case "waitText":
      return `Wait until ${loc} shows ${q(value)}`;
    case "acceptDialog":
      return "Accept the popup";
    case "dismissDialog":
      return "Dismiss the popup";
    case "promptDialog":
      return `Answer the prompt with ${q(value)}`;
    case "assertText":
      return `Assert ${loc} contains ${q(value)}`;
    case "assertValue":
      return `Assert ${loc} has value ${q(value)}`;
    case "assertVisible":
      return `Assert ${loc} is visible`;
    case "assertHidden":
      return `Assert ${loc} is hidden`;
    case "assertEnabled":
      return `Assert ${loc} is enabled`;
    case "assertDisabled":
      return `Assert ${loc} is disabled`;
    case "assertChecked":
      return `Assert ${loc} is checked`;
    case "assertCount":
      return `Assert ${loc} matches ${value} element(s)`;
    case "assertAttr":
      return `Assert ${loc} attribute ${q(value)}`;
  }
}

const s = (action: Action, loc?: string, value?: string, o: StepOpts = {}): Draft => ({
  action,
  loc,
  value,
  via: o.via,
  timeout: o.timeout,
  hint: o.hint,
  label: o.label ?? labelFor(action, loc, value),
});

const OPEN = s("open");

function t(id: string, title: string, description: string, drafts: Draft[]): TestCase {
  return { id, title, description, steps: drafts.map((d, i) => ({ ...d, id: `${id}.${i + 1}` })) };
}

/* ───────────── challenges ───────────── */

export const CHALLENGES: Challenge[] = [
  {
    id: "inputs",
    title: "Text Inputs",
    section: "Inputs",
    difficulty: "Easy",
    summary: "Text, email, password, number, date, phone, textarea, read-only and disabled fields.",
    elements: [
      { name: "Full name", locator: "#fullName", note: "text" },
      { name: "Email", locator: "#email", note: "email" },
      { name: "Age", locator: "#age", note: "number" },
      { name: "Date of birth", locator: "#dob", note: "date" },
      { name: "Read-only", locator: "#readonlyField", note: "readonly" },
      { name: "Submit", locator: "#submitInput", note: "button" },
      { name: "Result", locator: "#inputResult", note: "echo" },
    ],
    tips: ["Prefer id or data-testid over positional XPath.", "Read-only fields are readable but not editable; disabled fields are neither."],
    bug: { title: "Submit button is stuck disabled", detail: "A broken validation rule leaves #submitInput disabled even when every field is filled." },
    tests: [
      t("tc1", "Type into text fields", "Name and email accept input.", [
        OPEN,
        s("type", "#fullName", "Ram Sharma"),
        s("type", "#email", "ram@example.com"),
        s("assertValue", "#fullName", "Ram Sharma"),
      ]),
      t("tc2", "Number, date and textarea", "Special input types take values.", [
        OPEN,
        s("type", "#age", "27"),
        s("type", "#dob", "1999-05-14"),
        s("type", "#bio", "QA engineer in the making"),
        s("assertValue", "#age", "27"),
      ]),
      t("tc3", "Submit and verify the echo", "The result line shows what was submitted.", [
        OPEN,
        s("type", "#fullName", "Ram Sharma"),
        s("type", "#email", "ram@example.com"),
        s("type", "#age", "27"),
        s("click", "#submitInput"),
        s("assertText", "#inputResult", "Ram Sharma"),
      ]),
      t("tc4", "Read-only and disabled fields", "Their state can be asserted.", [
        OPEN,
        s("assertValue", "#readonlyField", "FS-1042"),
        s("assertDisabled", "#disabledField"),
      ]),
    ],
  },
  {
    id: "forms",
    title: "Login & Registration",
    section: "Forms",
    difficulty: "Easy",
    summary: "A login form with valid and invalid credentials, and a full registration form.",
    elements: [
      { name: "Login user", locator: "#loginUser", note: "email" },
      { name: "Login button", locator: "#loginBtn", note: "button" },
      { name: "Gender (female)", locator: "#genderFemale", note: "radio" },
      { name: "Country", locator: "#country", note: "dropdown" },
      { name: "Terms", locator: "#terms", note: "checkbox" },
      { name: "Register", locator: "#registerBtn", note: "button" },
      { name: "Success", locator: "#formSuccess", note: "banner" },
    ],
    tips: ["Assert the outcome (message), not just that the click happened.", "Test the negative path too — invalid credentials."],
    bug: { title: "Country list is missing 'India'", detail: "The dropdown is built from a broken data source, so the expected option does not exist." },
    tests: [
      t("tc1", "Valid login", "Correct credentials sign the user in.", [
        OPEN,
        s("type", "#loginUser", "student@futurestack.in"),
        s("type", "#loginPass", "Learn@123"),
        s("click", "#loginBtn"),
        s("assertText", "#loginMsg", "Welcome back"),
      ]),
      t("tc2", "Invalid login", "Wrong password is rejected.", [
        OPEN,
        s("type", "#loginUser", "student@futurestack.in"),
        s("type", "#loginPass", "wrong-pass"),
        s("click", "#loginBtn"),
        s("assertText", "#loginMsg", "Invalid credentials"),
      ]),
      t("tc3", "Register a new user", "Fill every control type and submit.", [
        OPEN,
        s("type", "#firstName", "Ram"),
        s("type", "#lastName", "Sharma"),
        s("click", "#genderMale"),
        s("select", "#country", "India"),
        s("check", "#terms"),
        s("click", "#registerBtn"),
        s("assertVisible", "#formSuccess"),
      ]),
    ],
  },
  {
    id: "otp",
    title: "OTP Login",
    section: "OTP Login",
    difficulty: "Medium",
    summary: "Fetch an OTP, wait for the OTP box, verify, resend and handle a wrong code.",
    elements: [
      { name: "Mobile", locator: "#mobile", note: "tel" },
      { name: "Fetch OTP", locator: "#fetchOtp", note: "button" },
      { name: "OTP field", locator: "#otpInput", note: "appears after ~1.5s" },
      { name: "Verify", locator: "#verifyOtp", note: "button" },
      { name: "Welcome", locator: "#welcomeMsg", note: "text" },
    ],
    tips: ["The OTP box is not in the DOM immediately — wait for it, never sleep.", "Assert on the error text for the wrong-code path."],
    bug: { title: "OTP service is down", detail: "The OTP box never appears (the request hangs), so every step after Fetch OTP is blocked." },
    tests: [
      t("tc1", "Request an OTP", "Entering a number reveals the OTP box.", [
        OPEN,
        s("type", "#mobile", "9876543210"),
        s("click", "#fetchOtp"),
        s("waitVisible", "#otpInput", undefined, { timeout: 5000, hint: "Use an explicit wait with a realistic timeout, then check the OTP API." }),
      ]),
      t("tc2", "Verify with the correct OTP", "Full happy path to the welcome screen.", [
        OPEN,
        s("type", "#mobile", "9876543210"),
        s("click", "#fetchOtp"),
        s("waitVisible", "#otpInput", undefined, { timeout: 5000 }),
        s("type", "#otpInput", "123456"),
        s("click", "#verifyOtp"),
        s("assertText", "#welcomeMsg", "Login successful"),
      ]),
      t("tc3", "Reject a wrong OTP", "An incorrect code shows an error.", [
        OPEN,
        s("type", "#mobile", "9876543210"),
        s("click", "#fetchOtp"),
        s("waitVisible", "#otpInput", undefined, { timeout: 5000 }),
        s("type", "#otpInput", "000000"),
        s("click", "#verifyOtp"),
        s("assertText", "#otpError", "Invalid OTP"),
      ]),
      t("tc4", "Resend the OTP", "Resend confirms a new code was sent.", [
        OPEN,
        s("type", "#mobile", "9876543210"),
        s("click", "#fetchOtp"),
        s("waitVisible", "#otpInput", undefined, { timeout: 5000 }),
        s("click", "#resendOtp"),
        s("assertText", "#otpHint", "re-sent"),
      ]),
    ],
  },
  {
    id: "selection",
    title: "Selection Controls",
    section: "Selection",
    difficulty: "Easy",
    summary: "Radio, checkbox, dropdown, range slider, toggle and an autocomplete.",
    elements: [
      { name: "Plan (Pro)", locator: "#planPro", note: "radio" },
      { name: "Selenium skill", locator: "#skillSelenium", note: "checkbox" },
      { name: "Newsletter", locator: "#newsletter", note: "checkbox" },
      { name: "Level", locator: "#level", note: "dropdown" },
      { name: "Experience", locator: "#experience", note: "range 0-20" },
      { name: "Dark mode", locator: "#darkToggle", note: "switch" },
      { name: "City", locator: "#cityInput", note: "autocomplete" },
    ],
    tips: ["Check the state after interacting — checked, value or aria-checked.", "Autocomplete: type, wait for suggestions, click a suggestion."],
    bug: { title: "Newsletter checkbox is disabled", detail: "A feature flag left #newsletter disabled, so it can't be ticked." },
    tests: [
      t("tc1", "Radio and checkboxes", "Pick a plan and skills.", [
        OPEN,
        s("click", "#planPro"),
        s("check", "#skillSelenium"),
        s("check", "#newsletter"),
        s("assertChecked", "#planPro"),
        s("assertChecked", "#skillSelenium"),
      ]),
      t("tc2", "Dropdown and slider", "Choose a level and move the slider.", [
        OPEN,
        s("select", "#level", "Intermediate"),
        s("type", "#experience", "5"),
        s("assertText", "#experienceValue", "5"),
      ]),
      t("tc3", "Toggle and autocomplete", "Switch on dark mode, pick a city.", [
        OPEN,
        s("click", "#darkToggle"),
        s("assertAttr", "#darkToggle", "aria-checked=true"),
        s("type", "#cityInput", "Pu"),
        s("click", "#city-pune"),
        s("assertValue", "#cityInput", "Pune"),
      ]),
    ],
  },
  {
    id: "buttons",
    title: "Buttons & Mouse Actions",
    section: "Buttons",
    difficulty: "Easy",
    summary: "Click, double-click, right-click, hover menus, disabled buttons and tooltips.",
    elements: [
      { name: "Click", locator: "#singleClick", note: "click" },
      { name: "Double click", locator: "#doubleClick", note: "dblclick" },
      { name: "Right click", locator: "#rightClick", note: "contextmenu" },
      { name: "Hover", locator: "#hoverBtn", note: "opens a menu" },
      { name: "Disabled", locator: "#disabledBtn", note: "disabled" },
      { name: "Status", locator: "#clickStatus", note: "text" },
    ],
    tips: ["Advanced mouse actions need ActionChains / Actions in Selenium.", "Hover menus only exist while the pointer is over them."],
    bug: { title: "Double-click handler is broken", detail: "The double-click event is swallowed, so the status never changes." },
    tests: [
      t("tc1", "Click, double-click, right-click", "Each mouse action updates the status.", [
        OPEN,
        s("click", "#singleClick"),
        s("assertText", "#clickStatus", "Single click"),
        s("dblclick", "#doubleClick"),
        s("assertText", "#clickStatus", "Double click"),
        s("rightclick", "#rightClick"),
        s("assertText", "#clickStatus", "Right click"),
      ]),
      t("tc2", "Hover menu", "Hover reveals a menu; pick an item.", [
        OPEN,
        s("hover", "#hoverBtn"),
        s("waitVisible", "#hoverMenu", undefined, { timeout: 3000 }),
        s("click", "#hoverItem1"),
        s("assertText", "#clickStatus", "Menu item 1"),
      ]),
      t("tc3", "Disabled button and tooltip", "State and tooltip text.", [
        OPEN,
        s("assertDisabled", "#disabledBtn"),
        s("hover", "#tooltipBtn"),
        s("assertText", "#tooltipText", "Helpful tip"),
      ]),
    ],
  },
  {
    id: "tables",
    title: "Dynamic Tables",
    section: "Tables",
    difficulty: "Medium",
    summary: "Search, sort, paginate, select rows and add a user to a data table.",
    elements: [
      { name: "Table", locator: "#employeeTable", note: "rows" },
      { name: "Search", locator: "#tableSearch", note: "filter" },
      { name: "Sort salary", locator: "#sortSalary", note: "header" },
      { name: "Next page", locator: "#nextPage", note: "pagination" },
      { name: "Add user", locator: "#addUser", note: "button" },
    ],
    tips: ["Count rows with a CSS selector like #employeeTable tbody tr.", "After sorting, assert the first row — not just that the click worked."],
    bug: { title: "Sorting is broken", detail: "Clicking the salary header does not reorder the rows." },
    tests: [
      t("tc1", "Search the table", "Filtering narrows the rows.", [
        OPEN,
        s("type", "#tableSearch", "Priya"),
        s("assertCount", "#employeeTable tbody tr", "1"),
        s("assertText", "#employeeTable", "Priya"),
      ]),
      t("tc2", "Sort by salary", "Ascending sort puts the lowest salary first.", [
        OPEN,
        s("click", "#sortSalary"),
        s("assertText", "#employeeTable tbody tr:first-child", "Karan"),
      ]),
      t("tc3", "Paginate", "Next page shows the remaining rows.", [
        OPEN,
        s("click", "#nextPage"),
        s("assertText", "#pageInfo", "Page 2 of 2"),
        s("assertText", "#employeeTable", "Rohan"),
      ]),
      t("tc4", "Add a user", "A new row is searchable.", [
        OPEN,
        s("type", "#newName", "Tanvi"),
        s("type", "#newRole", "Tester"),
        s("type", "#newSalary", "40000"),
        s("click", "#addUser"),
        s("type", "#tableSearch", "Tanvi"),
        s("assertCount", "#employeeTable tbody tr", "1"),
      ]),
      t("tc5", "Select a row", "Row selection updates the counter.", [
        OPEN,
        s("check", "#select-row-1"),
        s("assertText", "#selectedCount", "1 selected"),
      ]),
    ],
  },
  {
    id: "dynamic",
    title: "Dynamic Elements",
    section: "Dynamic",
    difficulty: "Medium",
    summary: "Add/remove items, delayed loading, tabs and an iframe.",
    elements: [
      { name: "Add item", locator: "#addItem", note: "button" },
      { name: "Load content", locator: "#loadContent", note: "delayed" },
      { name: "Delayed text", locator: "#delayedText", note: "after ~2s" },
      { name: "Tab two", locator: "#tabTwo", note: "tab" },
      { name: "Iframe", locator: "#demoFrame", note: "iframe" },
    ],
    tips: ["Elements inside an iframe need a context switch first.", "Use an explicit wait for content that loads late."],
    bug: { title: "Content loads far too slowly", detail: "The delayed section takes 12 seconds instead of 2, longer than any sensible timeout." },
    tests: [
      t("tc1", "Add and remove items", "The list grows and shrinks.", [
        OPEN,
        s("click", "#addItem"),
        s("click", "#addItem"),
        s("assertCount", "#itemList li", "2"),
        s("click", "#itemList li:first-child .remove-item"),
        s("assertCount", "#itemList li", "1"),
      ]),
      t("tc2", "Wait for delayed content", "Explicit wait, then assert.", [
        OPEN,
        s("click", "#loadContent"),
        s("waitVisible", "#delayedText", undefined, { timeout: 5000, hint: "Real apps are slow sometimes. Raise the timeout sensibly, but also report a 12s load as a performance defect." }),
        s("assertText", "#delayedText", "Content loaded"),
      ]),
      t("tc3", "Switch tabs", "Each tab shows its own panel.", [
        OPEN,
        s("click", "#tabTwo"),
        s("assertText", "#tabPanel", "Second tab"),
        s("click", "#tabThree"),
        s("assertText", "#tabPanel", "Third tab"),
      ]),
      t("tc4", "Work inside an iframe", "Click a button that lives in a frame.", [
        OPEN,
        s("click", "#frameBtn", undefined, { via: { kind: "frame", host: "#demoFrame" } }),
        s("assertText", "#frameMsg", "Frame button clicked", { via: { kind: "frame", host: "#demoFrame" } }),
      ]),
    ],
  },
  {
    id: "changing",
    title: "Changing Attributes",
    section: "Changing Attributes",
    difficulty: "Hard",
    summary: "Live clock, countdown, rotating status, an id that changes and a mutating link.",
    elements: [
      { name: "Changing button", locator: "[id^='btn_']", note: "id differs each load" },
      { name: "Rotating status", locator: "#rotatingStatus", note: "cycles" },
      { name: "Countdown", locator: "#countdown", note: "ends at Done" },
      { name: "Dynamic link", locator: "#dynamicLink", note: "href changes" },
    ],
    tips: ["Never hard-code a generated id — match the stable prefix instead.", "Wait for text with a timeout instead of sleeping a guessed time."],
    bug: { title: "Countdown freezes", detail: "The countdown stops at 3 and never reaches Done." },
    tests: [
      t("tc1", "Click a button with a changing id", "Locate it by its stable prefix.", [
        OPEN,
        s("click", "[id^='btn_']"),
        s("assertText", "#changingStatus", "Clicked"),
      ]),
      t("tc2", "Wait for the rotating status", "It cycles Pending → Processing → Completed.", [
        OPEN,
        s("waitText", "#rotatingStatus", "Completed", { timeout: 8000 }),
        s("assertText", "#rotatingStatus", "Completed"),
      ]),
      t("tc3", "Wait for the countdown", "The countdown ends with Done.", [
        OPEN,
        s("waitText", "#countdown", "Done", { timeout: 8000, hint: "The timer is frozen — this is an application defect, not a timing problem." }),
      ]),
      t("tc4", "Mutating link", "The href keeps a stable prefix.", [
        OPEN,
        s("assertAttr", "#dynamicLink", "href^=/item/"),
      ]),
    ],
  },
  {
    id: "popups",
    title: "Popups, Confirms & Toasts",
    section: "Popups",
    difficulty: "Medium",
    summary: "Accept, dismiss and answer popups (simple, confirm and prompt), plus an auto-hiding toast.",
    elements: [
      { name: "Popup", locator: "#simplePopup", note: "OK only" },
      { name: "Confirm", locator: "#confirmPopup", note: "OK / Cancel" },
      { name: "Prompt", locator: "#promptPopup", note: "input + OK" },
      { name: "Toast", locator: "#showToast", note: "auto-hides" },
      { name: "Outcome", locator: "#popupResult", note: "text" },
    ],
    tips: ["Popups block the page — switch to them before anything else.", "Toasts disappear on their own, so assert while visible."],
    bug: { title: "Prompt popup never opens", detail: "The prompt trigger fires but no popup is shown." },
    tests: [
      t("tc1", "Accept a simple popup", "OK closes the popup.", [
        OPEN,
        s("click", "#simplePopup"),
        s("acceptDialog"),
        s("assertText", "#popupResult", "Popup accepted"),
      ]),
      t("tc2", "Dismiss a confirm", "Cancel is recorded.", [
        OPEN,
        s("click", "#confirmPopup"),
        s("dismissDialog"),
        s("assertText", "#popupResult", "Confirm cancelled"),
      ]),
      t("tc3", "Answer a prompt", "The typed name is echoed.", [
        OPEN,
        s("click", "#promptPopup"),
        s("promptDialog", undefined, "Ram"),
        s("assertText", "#popupResult", "Hello, Ram"),
      ]),
      t("tc4", "Toast notification", "It appears with the right text.", [
        OPEN,
        s("click", "#showToast"),
        s("waitVisible", "#toast", undefined, { timeout: 3000 }),
        s("assertText", "#toast", "Saved successfully"),
      ]),
    ],
  },
  {
    id: "advanced",
    title: "Advanced Controls",
    section: "Advanced",
    difficulty: "Hard",
    summary: "File upload, drag and drop, Shadow DOM and a progress bar.",
    elements: [
      { name: "File input", locator: "#fileUpload", note: "type=file" },
      { name: "Drag item", locator: "#dragItem", note: "draggable" },
      { name: "Drop zone", locator: "#dropZone", note: "target" },
      { name: "Shadow host", locator: "#shadowHost", note: "shadow root" },
      { name: "Progress", locator: "#progressLabel", note: "0 → 100%" },
    ],
    tips: ["File inputs take a path directly — don't click them.", "Shadow DOM needs a shadow-root hop in Selenium; Playwright pierces it."],
    bug: { title: "Drop zone ignores drops", detail: "The drop handler is missing, so dragging an item does nothing." },
    tests: [
      t("tc1", "Upload a file", "The file name is reported.", [
        OPEN,
        s("upload", "#fileUpload", "sample.txt"),
        s("click", "#uploadBtn"),
        s("assertText", "#uploadResult", "sample.txt"),
      ]),
      t("tc2", "Drag and drop", "The item lands in the zone.", [
        OPEN,
        s("drag", "#dragItem", "#dropZone"),
        s("assertText", "#dropZone", "Dropped"),
      ]),
      t("tc3", "Shadow DOM", "Type and click inside a shadow root.", [
        OPEN,
        s("type", "#shadowInput", "Ram", { via: { kind: "shadow", host: "#shadowHost" } }),
        s("click", "#shadowBtn", undefined, { via: { kind: "shadow", host: "#shadowHost" } }),
        s("assertText", "#shadowOut", "Hello, Ram", { via: { kind: "shadow", host: "#shadowHost" } }),
      ]),
      t("tc4", "Progress bar", "Wait until it hits 100%.", [
        OPEN,
        s("click", "#startProgress"),
        s("waitText", "#progressLabel", "100%", { timeout: 8000 }),
      ]),
    ],
  },
  {
    id: "shopping",
    title: "Shopping Cart E2E",
    section: "Shopping",
    difficulty: "Hard",
    summary: "Search products, add to cart, change quantity, apply a coupon and check out.",
    elements: [
      { name: "Search", locator: "#productSearch", note: "text" },
      { name: "Add mouse", locator: "#add-wireless-mouse", note: "button" },
      { name: "Quantity", locator: "#qty-wireless-mouse", note: "number" },
      { name: "Coupon", locator: "#coupon", note: "FUTURE10" },
      { name: "Total", locator: "#orderTotal", note: "text" },
      { name: "Checkout", locator: "#checkoutBtn", note: "button" },
    ],
    tips: ["Build long flows from independent test cases — each starts fresh.", "Assert money values after every price-changing step."],
    bug: { title: "Coupon service rejects valid codes", detail: "FUTURE10 is rejected, so the discounted total is never applied." },
    tests: [
      t("tc1", "Search and add to cart", "Filter products then add one.", [
        OPEN,
        s("type", "#productSearch", "Mouse"),
        s("assertCount", ".product-card", "1"),
        s("click", "#add-wireless-mouse"),
        s("assertText", "#cartCount", "1"),
      ]),
      t("tc2", "Change quantity", "The total follows the quantity.", [
        OPEN,
        s("click", "#add-wireless-mouse"),
        s("type", "#qty-wireless-mouse", "3"),
        s("assertText", "#orderTotal", "2397"),
      ]),
      t("tc3", "Coupon and checkout", "10% off, then place the order.", [
        OPEN,
        s("click", "#add-wireless-mouse"),
        s("type", "#coupon", "FUTURE10"),
        s("click", "#applyCoupon"),
        s("assertText", "#orderTotal", "719"),
        s("click", "#checkoutBtn"),
        s("assertText", "#orderSuccess", "Order placed"),
      ]),
    ],
  },
  {
    id: "lab",
    title: "Practice Lab",
    section: "Practice Lab",
    difficulty: "Hard",
    summary: "Multi-step wizard, custom date picker, re-rendered element, popup and forgot password.",
    elements: [
      { name: "Wizard next", locator: "#wizNext", note: "button" },
      { name: "Date trigger", locator: "#dateTrigger", note: "opens calendar" },
      { name: "Stale button", locator: "#staleBtn", note: "re-renders" },
      { name: "Open popup", locator: "#openPopup", note: "modal" },
      { name: "Forgot link", locator: "#forgotLink", note: "toggle" },
    ],
    tips: ["After the DOM re-renders, find the element again instead of reusing a reference.", "Custom date pickers are just buttons — click the day cell."],
    bug: { title: "Wizard step 2 can't continue", detail: "On step 2 the Next button stays disabled, so the wizard can't be completed." },
    tests: [
      t("tc1", "Complete the wizard", "Three steps, then done.", [
        OPEN,
        s("type", "#wizName", "Ram"),
        s("click", "#wizNext"),
        s("select", "#wizPlan", "Pro"),
        s("click", "#wizNext"),
        s("assertText", "#wizReview", "Ram"),
        s("click", "#wizSubmit"),
        s("assertText", "#wizDone", "Wizard completed"),
      ]),
      t("tc2", "Custom date picker", "Pick a day from the calendar.", [
        OPEN,
        s("click", "#dateTrigger"),
        s("click", "[data-testid='day-15']"),
        s("assertText", "#pickedDate", "15"),
      ]),
      t("tc3", "Element re-rendered", "Re-locate after the DOM changes.", [
        OPEN,
        s("click", "#staleBtn"),
        s("waitText", "#staleStatus", "Re-rendered", { timeout: 4000 }),
        s("click", "#staleTarget"),
        s("assertText", "#staleStatus", "Fresh element clicked"),
      ]),
      t("tc4", "Popup", "Open and close a modal.", [
        OPEN,
        s("click", "#openPopup"),
        s("assertVisible", "#popup"),
        s("click", "#popupClose"),
        s("assertHidden", "#popup"),
      ]),
      t("tc5", "Forgot password", "A reset link is sent.", [
        OPEN,
        s("click", "#forgotLink"),
        s("type", "#fpEmail", "ram@example.com"),
        s("click", "#fpSend"),
        s("assertText", "#fpMsg", "Reset link sent to ram@example.com"),
      ]),
    ],
  },
];

export const TOTAL_TESTS = CHALLENGES.reduce((n, c) => n + c.tests.length, 0);
export const TOTAL_STEPS = CHALLENGES.reduce((n, c) => n + c.tests.reduce((m, x) => m + x.steps.length, 0), 0);
