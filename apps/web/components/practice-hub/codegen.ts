import type { Challenge, Lang, Step } from "./data";

export interface Generated {
  lines: string[];
  /** lineOwner[i] = id of the step that produced line i (0-based), or null for scaffolding. */
  lineOwner: (string | null)[];
  /** first line (1-based) of each step */
  stepLine: Record<string, number>;
}

const BASE = (c: Challenge) => `https://www.futurestack.co.in/practice-hub#${c.id}`;
const j = (v?: string) => JSON.stringify(v ?? "");
const isId = (sel: string) => /^#[A-Za-z][\w-]*$/.test(sel);
const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const camel = (title: string) =>
  title
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join("");
const pascal = (title: string) => {
  const c = camel(title);
  return c ? c[0].toUpperCase() + c.slice(1) : "Test";
};
const secs = (ms?: number) => Math.max(1, Math.round((ms ?? 5000) / 1000));

function attr(v: string) {
  const m = /^([\w-]+)(\^=|=)(.*)$/.exec(v) ?? [];
  return { name: m[1] ?? v, op: m[2] ?? "=", exp: m[3] ?? "" };
}

type Out = string | string[];

/* ───────────── Python (Selenium) ───────────── */

function py(st: Step, c: Challenge): Out {
  const by = (sel = st.loc!) => (isId(sel) ? `By.ID, ${j(sel.slice(1))}` : `By.CSS_SELECTOR, ${j(sel)}`);
  const find = (sel = st.loc!) => `driver.find_element(${by(sel)})`;
  const el =
    st.via?.kind === "shadow"
      ? `${find(st.via.host)}.shadow_root.find_element(${by()})`
      : find();
  const v = j(st.value);
  const t = secs(st.timeout);
  const body = ((): Out => {
    switch (st.action) {
      case "open":
        return "driver.get(BASE)";
      case "type":
        return [`${el}.clear()`, `${el}.send_keys(${v})`];
      case "click":
        return `${el}.click()`;
      case "dblclick":
        return `ActionChains(driver).double_click(${el}).perform()`;
      case "rightclick":
        return `ActionChains(driver).context_click(${el}).perform()`;
      case "hover":
        return `ActionChains(driver).move_to_element(${el}).perform()`;
      case "select":
        return `Select(${el}).select_by_visible_text(${v})`;
      case "check":
        return `if not ${el}.is_selected(): ${el}.click()`;
      case "uncheck":
        return `if ${el}.is_selected(): ${el}.click()`;
      case "upload":
        return `${el}.send_keys(os.path.abspath(${v}))`;
      case "drag":
        return `ActionChains(driver).drag_and_drop(${el}, ${find(st.value)}).perform()`;
      case "waitVisible":
        return `WebDriverWait(driver, ${t}).until(EC.visibility_of_element_located((${by()})))`;
      case "waitText":
        return `WebDriverWait(driver, ${t}).until(EC.text_to_be_present_in_element((${by()}), ${v}))`;
      case "acceptDialog":
        return "driver.switch_to.alert.accept()";
      case "dismissDialog":
        return "driver.switch_to.alert.dismiss()";
      case "promptDialog":
        return ["alert = driver.switch_to.alert", `alert.send_keys(${v})`, "alert.accept()"];
      case "assertText":
        return `assert ${v} in ${el}.text`;
      case "assertValue":
        return `assert ${el}.get_attribute("value") == ${v}`;
      case "assertVisible":
        return `assert ${el}.is_displayed()`;
      case "assertHidden":
        return `assert not driver.find_elements(${by()}) or not ${el}.is_displayed()`;
      case "assertEnabled":
        return `assert ${el}.is_enabled()`;
      case "assertDisabled":
        return `assert not ${el}.is_enabled()`;
      case "assertChecked":
        return `assert ${el}.is_selected()`;
      case "assertCount":
        return `assert len(driver.find_elements(${by()})) == ${st.value}`;
      case "assertAttr": {
        const a = attr(st.value ?? "");
        return a.op === "="
          ? `assert ${el}.get_attribute(${j(a.name)}) == ${j(a.exp)}`
          : `assert ${el}.get_attribute(${j(a.name)}).startswith(${j(a.exp)})`;
      }
    }
  })();
  const arr = Array.isArray(body) ? body : [body];
  if (st.via?.kind === "frame") {
    return [`driver.switch_to.frame(${find(st.via.host)})`, ...arr, "driver.switch_to.default_content()"];
  }
  void c;
  return arr;
}

/* ───────────── Java (Selenium) ───────────── */

function java(st: Step): Out {
  const by = (sel = st.loc!) => (isId(sel) ? `By.id(${j(sel.slice(1))})` : `By.cssSelector(${j(sel)})`);
  const find = (sel = st.loc!) => `driver.findElement(${by(sel)})`;
  const el =
    st.via?.kind === "shadow"
      ? `${find(st.via.host)}.getShadowRoot().findElement(${by()})`
      : find();
  const v = j(st.value);
  const body = ((): Out => {
    switch (st.action) {
      case "open":
        return "driver.get(BASE);";
      case "type":
        return [`${el}.clear();`, `${el}.sendKeys(${v});`];
      case "click":
        return `${el}.click();`;
      case "dblclick":
        return `new Actions(driver).doubleClick(${el}).perform();`;
      case "rightclick":
        return `new Actions(driver).contextClick(${el}).perform();`;
      case "hover":
        return `new Actions(driver).moveToElement(${el}).perform();`;
      case "select":
        return `new Select(${el}).selectByVisibleText(${v});`;
      case "check":
        return `if (!${el}.isSelected()) ${el}.click();`;
      case "uncheck":
        return `if (${el}.isSelected()) ${el}.click();`;
      case "upload":
        return `${el}.sendKeys(new File(${v}).getAbsolutePath());`;
      case "drag":
        return `new Actions(driver).dragAndDrop(${el}, ${find(st.value)}).perform();`;
      case "waitVisible":
        return `new WebDriverWait(driver, Duration.ofSeconds(${secs(st.timeout)})).until(ExpectedConditions.visibilityOfElementLocated(${by()}));`;
      case "waitText":
        return `new WebDriverWait(driver, Duration.ofSeconds(${secs(st.timeout)})).until(ExpectedConditions.textToBePresentInElementLocated(${by()}, ${v}));`;
      case "acceptDialog":
        return "driver.switchTo().alert().accept();";
      case "dismissDialog":
        return "driver.switchTo().alert().dismiss();";
      case "promptDialog":
        return ["Alert alert = driver.switchTo().alert();", `alert.sendKeys(${v});`, "alert.accept();"];
      case "assertText":
        return `Assert.assertTrue(${el}.getText().contains(${v}));`;
      case "assertValue":
        return `Assert.assertEquals(${el}.getAttribute("value"), ${v});`;
      case "assertVisible":
        return `Assert.assertTrue(${el}.isDisplayed());`;
      case "assertHidden":
        return `Assert.assertTrue(driver.findElements(${by()}).isEmpty() || !${el}.isDisplayed());`;
      case "assertEnabled":
        return `Assert.assertTrue(${el}.isEnabled());`;
      case "assertDisabled":
        return `Assert.assertFalse(${el}.isEnabled());`;
      case "assertChecked":
        return `Assert.assertTrue(${el}.isSelected());`;
      case "assertCount":
        return `Assert.assertEquals(driver.findElements(${by()}).size(), ${st.value});`;
      case "assertAttr": {
        const a = attr(st.value ?? "");
        return a.op === "="
          ? `Assert.assertEquals(${el}.getAttribute(${j(a.name)}), ${j(a.exp)});`
          : `Assert.assertTrue(${el}.getAttribute(${j(a.name)}).startsWith(${j(a.exp)}));`;
      }
    }
  })();
  const arr = Array.isArray(body) ? body : [body];
  if (st.via?.kind === "frame") {
    return [`driver.switchTo().frame(${find(st.via.host)});`, ...arr, "driver.switchTo().defaultContent();"];
  }
  return arr;
}

/* ───────────── C# (Selenium) ───────────── */

function cs(st: Step): Out {
  const by = (sel = st.loc!) => (isId(sel) ? `By.Id(${j(sel.slice(1))})` : `By.CssSelector(${j(sel)})`);
  const find = (sel = st.loc!) => `driver.FindElement(${by(sel)})`;
  const el =
    st.via?.kind === "shadow"
      ? `${find(st.via.host)}.GetShadowRoot().FindElement(${by()})`
      : find();
  const v = j(st.value);
  const body = ((): Out => {
    switch (st.action) {
      case "open":
        return "driver.Navigate().GoToUrl(BASE);";
      case "type":
        return [`${el}.Clear();`, `${el}.SendKeys(${v});`];
      case "click":
        return `${el}.Click();`;
      case "dblclick":
        return `new Actions(driver).DoubleClick(${el}).Perform();`;
      case "rightclick":
        return `new Actions(driver).ContextClick(${el}).Perform();`;
      case "hover":
        return `new Actions(driver).MoveToElement(${el}).Perform();`;
      case "select":
        return `new SelectElement(${el}).SelectByText(${v});`;
      case "check":
        return `if (!${el}.Selected) ${el}.Click();`;
      case "uncheck":
        return `if (${el}.Selected) ${el}.Click();`;
      case "upload":
        return `${el}.SendKeys(Path.GetFullPath(${v}));`;
      case "drag":
        return `new Actions(driver).DragAndDrop(${el}, ${find(st.value)}).Perform();`;
      case "waitVisible":
        return `new WebDriverWait(driver, TimeSpan.FromSeconds(${secs(st.timeout)})).Until(d => d.FindElement(${by()}).Displayed);`;
      case "waitText":
        return `new WebDriverWait(driver, TimeSpan.FromSeconds(${secs(st.timeout)})).Until(d => d.FindElement(${by()}).Text.Contains(${v}));`;
      case "acceptDialog":
        return "driver.SwitchTo().Alert().Accept();";
      case "dismissDialog":
        return "driver.SwitchTo().Alert().Dismiss();";
      case "promptDialog":
        return ["var alert = driver.SwitchTo().Alert();", `alert.SendKeys(${v});`, "alert.Accept();"];
      case "assertText":
        return `Assert.That(${el}.Text, Does.Contain(${v}));`;
      case "assertValue":
        return `Assert.That(${el}.GetAttribute("value"), Is.EqualTo(${v}));`;
      case "assertVisible":
        return `Assert.That(${el}.Displayed);`;
      case "assertHidden":
        return `Assert.That(driver.FindElements(${by()}).Count == 0 || !${el}.Displayed);`;
      case "assertEnabled":
        return `Assert.That(${el}.Enabled);`;
      case "assertDisabled":
        return `Assert.That(!${el}.Enabled);`;
      case "assertChecked":
        return `Assert.That(${el}.Selected);`;
      case "assertCount":
        return `Assert.That(driver.FindElements(${by()}).Count, Is.EqualTo(${st.value}));`;
      case "assertAttr": {
        const a = attr(st.value ?? "");
        return a.op === "="
          ? `Assert.That(${el}.GetAttribute(${j(a.name)}), Is.EqualTo(${j(a.exp)}));`
          : `Assert.That(${el}.GetAttribute(${j(a.name)}), Does.StartWith(${j(a.exp)}));`;
      }
    }
  })();
  const arr = Array.isArray(body) ? body : [body];
  if (st.via?.kind === "frame") {
    return [`driver.SwitchTo().Frame(${find(st.via.host)});`, ...arr, "driver.SwitchTo().DefaultContent();"];
  }
  return arr;
}

/* ───────────── Playwright ───────────── */

function pw(st: Step): Out {
  const base = st.via?.kind === "frame" ? `page.frameLocator(${j(st.via.host)})` : "page";
  const el = (sel = st.loc!) => `${base}.locator(${j(sel)})`;
  const v = j(st.value);
  const to = st.timeout ?? 5000;
  switch (st.action) {
    case "open":
      return "await page.goto(BASE);";
    case "type":
      return `await ${el()}.fill(${v});`;
    case "click":
      return `await ${el()}.click();`;
    case "dblclick":
      return `await ${el()}.dblclick();`;
    case "rightclick":
      return `await ${el()}.click({ button: 'right' });`;
    case "hover":
      return `await ${el()}.hover();`;
    case "select":
      return `await ${el()}.selectOption({ label: ${v} });`;
    case "check":
      return `await ${el()}.check();`;
    case "uncheck":
      return `await ${el()}.uncheck();`;
    case "upload":
      return `await ${el()}.setInputFiles(${v});`;
    case "drag":
      return `await ${el()}.dragTo(${el(st.value)});`;
    case "waitVisible":
      return `await ${el()}.waitFor({ state: 'visible', timeout: ${to} });`;
    case "waitText":
      return `await expect(${el()}).toContainText(${v}, { timeout: ${to} });`;
    case "acceptDialog":
      return "page.once('dialog', dialog => dialog.accept()); // register before the click that opens it";
    case "dismissDialog":
      return "page.once('dialog', dialog => dialog.dismiss()); // register before the click that opens it";
    case "promptDialog":
      return `page.once('dialog', dialog => dialog.accept(${v})); // register before the click that opens it`;
    case "assertText":
      return `await expect(${el()}).toContainText(${v});`;
    case "assertValue":
      return `await expect(${el()}).toHaveValue(${v});`;
    case "assertVisible":
      return `await expect(${el()}).toBeVisible();`;
    case "assertHidden":
      return `await expect(${el()}).toBeHidden();`;
    case "assertEnabled":
      return `await expect(${el()}).toBeEnabled();`;
    case "assertDisabled":
      return `await expect(${el()}).toBeDisabled();`;
    case "assertChecked":
      return `await expect(${el()}).toBeChecked();`;
    case "assertCount":
      return `await expect(${el()}).toHaveCount(${st.value});`;
    case "assertAttr": {
      const a = attr(st.value ?? "");
      return a.op === "="
        ? `await expect(${el()}).toHaveAttribute(${j(a.name)}, ${j(a.exp)});`
        : `await expect(${el()}).toHaveAttribute(${j(a.name)}, /^${a.exp.replace(/[/.*+?^${}()|[\]\\]/g, "\\$&")}/);`;
    }
  }
}

/* ───────────── Cypress ───────────── */

function cy(st: Step): Out {
  const get = (sel = st.loc!, opts = "") => {
    if (st.via?.kind === "frame") {
      return `cy.get(${j(st.via.host)}).its('0.contentDocument.body').then(cy.wrap).find(${j(sel)})`;
    }
    if (st.via?.kind === "shadow") return `cy.get(${j(st.via.host)}).shadow().find(${j(sel)})`;
    return `cy.get(${j(sel)}${opts})`;
  };
  const v = j(st.value);
  const to = `, { timeout: ${st.timeout ?? 5000} }`;
  switch (st.action) {
    case "open":
      return "cy.visit(BASE);";
    case "type":
      return `${get()}.clear().type(${v});`;
    case "click":
      return `${get()}.click();`;
    case "dblclick":
      return `${get()}.dblclick();`;
    case "rightclick":
      return `${get()}.rightclick();`;
    case "hover":
      return `${get()}.trigger('mouseover');`;
    case "select":
      return `${get()}.select(${v});`;
    case "check":
      return `${get()}.check();`;
    case "uncheck":
      return `${get()}.uncheck();`;
    case "upload":
      return `${get()}.selectFile(${v});`;
    case "drag":
      return [`${get()}.trigger('dragstart');`, `${get(st.value)}.trigger('drop');`];
    case "waitVisible":
      return `${get(undefined, to)}.should('be.visible');`;
    case "waitText":
      return `${get(undefined, to)}.should('contain.text', ${v});`;
    case "acceptDialog":
      return "cy.on('window:confirm', () => true); // register before the click that opens it";
    case "dismissDialog":
      return "cy.on('window:confirm', () => false); // register before the click that opens it";
    case "promptDialog":
      return `cy.window().then(win => cy.stub(win, 'prompt').returns(${v})); // before the click`;
    case "assertText":
      return `${get()}.should('contain.text', ${v});`;
    case "assertValue":
      return `${get()}.should('have.value', ${v});`;
    case "assertVisible":
      return `${get()}.should('be.visible');`;
    case "assertHidden":
      return `${get()}.should('not.exist');`;
    case "assertEnabled":
      return `${get()}.should('be.enabled');`;
    case "assertDisabled":
      return `${get()}.should('be.disabled');`;
    case "assertChecked":
      return `${get()}.should('be.checked');`;
    case "assertCount":
      return `${get()}.should('have.length', ${st.value});`;
    case "assertAttr": {
      const a = attr(st.value ?? "");
      return a.op === "="
        ? `${get()}.should('have.attr', ${j(a.name)}, ${j(a.exp)});`
        : `${get()}.should('have.attr', ${j(a.name)}).and('match', /^${a.exp.replace(/[/.*+?^${}()|[\]\\]/g, "\\$&")}/);`;
    }
  }
}

/* ───────────── Robot Framework ───────────── */

const R = "    ";
function robot(st: Step): Out {
  const loc = (sel = st.loc!) => (isId(sel) ? `id=${sel.slice(1)}` : `css:${sel}`);
  const l = st.via?.kind === "shadow" ? "" : loc();
  const v = st.value ?? "";
  const t = `${secs(st.timeout)}s`;
  const shadow = (js: string) =>
    `Execute Javascript${R}document.querySelector(${j(st.via!.host)}).shadowRoot.querySelector(${j(st.loc)})${js}`;
  const body = ((): Out => {
    if (st.via?.kind === "shadow") {
      if (st.action === "click") return shadow(".click()");
      if (st.action === "type") return shadow(`.value = ${j(v)}`);
      if (st.action === "assertText")
        return [
          `\${text}=${R}Execute Javascript${R}return document.querySelector(${j(st.via.host)}).shadowRoot.querySelector(${j(st.loc)}).textContent`,
          `Should Contain${R}\${text}${R}${v}`,
        ];
    }
    switch (st.action) {
      case "open":
        return `Go To${R}\${BASE}`;
      case "type":
        return `Input Text${R}${l}${R}${v}`;
      case "click":
        return `Click Element${R}${l}`;
      case "dblclick":
        return `Double Click Element${R}${l}`;
      case "rightclick":
        return `Open Context Menu${R}${l}`;
      case "hover":
        return `Mouse Over${R}${l}`;
      case "select":
        return `Select From List By Label${R}${l}${R}${v}`;
      case "check":
        return `Select Checkbox${R}${l}`;
      case "uncheck":
        return `Unselect Checkbox${R}${l}`;
      case "upload":
        return `Choose File${R}${l}${R}\${CURDIR}/${v}`;
      case "drag":
        return `Drag And Drop${R}${l}${R}${loc(st.value)}`;
      case "waitVisible":
        return `Wait Until Element Is Visible${R}${l}${R}timeout=${t}`;
      case "waitText":
        return `Wait Until Element Contains${R}${l}${R}${v}${R}timeout=${t}`;
      case "acceptDialog":
        return `Handle Alert${R}ACCEPT`;
      case "dismissDialog":
        return `Handle Alert${R}DISMISS`;
      case "promptDialog":
        return [`Input Text Into Alert${R}${v}`, `Handle Alert${R}ACCEPT`];
      case "assertText":
        return `Element Should Contain${R}${l}${R}${v}`;
      case "assertValue":
        return `Textfield Value Should Be${R}${l}${R}${v}`;
      case "assertVisible":
        return `Element Should Be Visible${R}${l}`;
      case "assertHidden":
        return `Element Should Not Be Visible${R}${l}`;
      case "assertEnabled":
        return `Element Should Be Enabled${R}${l}`;
      case "assertDisabled":
        return `Element Should Be Disabled${R}${l}`;
      case "assertChecked":
        return `Checkbox Should Be Selected${R}${l}`;
      case "assertCount":
        return [`\${count}=${R}Get Element Count${R}${l}`, `Should Be Equal As Integers${R}\${count}${R}${v}`];
      case "assertAttr": {
        const a = attr(v);
        return [
          `\${attr}=${R}Get Element Attribute${R}${l}${R}${a.name}`,
          a.op === "=" ? `Should Be Equal${R}\${attr}${R}${a.exp}` : `Should Start With${R}\${attr}${R}${a.exp}`,
        ];
      }
    }
  })();
  const arr = Array.isArray(body) ? body : [body];
  if (st.via?.kind === "frame") return [`Select Frame${R}${loc(st.via.host)}`, ...arr, "Unselect Frame"];
  return arr;
}

/* ───────────── assembly ───────────── */

export function generate(lang: Lang, c: Challenge): Generated {
  const lines: string[] = [];
  const lineOwner: (string | null)[] = [];
  const stepLine: Record<string, number> = {};
  const add = (text: string, owner: string | null = null) => {
    lines.push(text);
    lineOwner.push(owner);
  };
  const addStep = (st: Step, out: Out, indent: string) => {
    const arr = Array.isArray(out) ? out : [out];
    stepLine[st.id] = lines.length + 1;
    arr.forEach((l) => add(indent + l, st.id));
  };

  const emitters: Record<Lang, (st: Step) => Out> = {
    python: (st) => py(st, c),
    java,
    csharp: cs,
    playwright: pw,
    cypress: cy,
    robot,
  };
  const emit = emitters[lang];

  switch (lang) {
    case "python":
      [
        "import os",
        "from selenium import webdriver",
        "from selenium.webdriver.common.by import By",
        "from selenium.webdriver.common.action_chains import ActionChains",
        "from selenium.webdriver.support.ui import Select, WebDriverWait",
        "from selenium.webdriver.support import expected_conditions as EC",
        "",
        `BASE = ${j(BASE(c))}`,
        "driver = webdriver.Chrome()",
      ].forEach((l) => add(l));
      c.tests.forEach((tc, i) => {
        add("");
        add("");
        add(`def test_tc${i + 1}_${slug(tc.title)}():`);
        add(`    """${tc.description}"""`);
        tc.steps.forEach((st) => addStep(st, emit(st), "    "));
      });
      break;
    case "java":
      [
        "import org.openqa.selenium.*;",
        "import org.openqa.selenium.chrome.ChromeDriver;",
        "import org.openqa.selenium.interactions.Actions;",
        "import org.openqa.selenium.support.ui.*;",
        "import org.testng.Assert;",
        "import org.testng.annotations.Test;",
        "import java.io.File;",
        "import java.time.Duration;",
        "",
        `public class ${pascal(c.title)}Test {`,
        `    static final String BASE = ${j(BASE(c))};`,
        "    WebDriver driver = new ChromeDriver();",
      ].forEach((l) => add(l));
      c.tests.forEach((tc, i) => {
        add("");
        add("    @Test");
        add(`    public void tc${i + 1}_${camel(tc.title)}() {`);
        tc.steps.forEach((st) => addStep(st, emit(st), "        "));
        add("    }");
      });
      add("}");
      break;
    case "csharp":
      [
        "using NUnit.Framework;",
        "using OpenQA.Selenium;",
        "using OpenQA.Selenium.Chrome;",
        "using OpenQA.Selenium.Interactions;",
        "using OpenQA.Selenium.Support.UI;",
        "",
        "[TestFixture]",
        `public class ${pascal(c.title)}Tests`,
        "{",
        `    const string BASE = ${j(BASE(c))};`,
        "    IWebDriver driver = new ChromeDriver();",
      ].forEach((l) => add(l));
      c.tests.forEach((tc, i) => {
        add("");
        add("    [Test]");
        add(`    public void TC${i + 1}_${pascal(tc.title)}()`);
        add("    {");
        tc.steps.forEach((st) => addStep(st, emit(st), "        "));
        add("    }");
      });
      add("}");
      break;
    case "playwright":
      add("import { test, expect } from '@playwright/test';");
      add("");
      add(`const BASE = ${j(BASE(c))};`);
      c.tests.forEach((tc, i) => {
        add("");
        add(`test('TC${i + 1} — ${tc.title}', async ({ page }) => {`);
        tc.steps.forEach((st) => addStep(st, emit(st), "  "));
        add("});");
      });
      break;
    case "cypress":
      add(`const BASE = ${j(BASE(c))};`);
      add("");
      add(`describe(${j(c.title)}, () => {`);
      c.tests.forEach((tc, i) => {
        if (i > 0) add("");
        add(`  it('TC${i + 1} — ${tc.title}', () => {`);
        tc.steps.forEach((st) => addStep(st, emit(st), "    "));
        add("  });");
      });
      add("});");
      break;
    case "robot":
      add("*** Settings ***");
      add("Library    SeleniumLibrary");
      add("");
      add("*** Variables ***");
      add(`\${BASE}    ${BASE(c)}`);
      add("");
      add("*** Test Cases ***");
      c.tests.forEach((tc, i) => {
        add(`TC${i + 1} ${tc.title}`);
        add(`    [Documentation]    ${tc.description}`);
        tc.steps.forEach((st) => addStep(st, emit(st), "    "));
        add("");
      });
      break;
  }

  return { lines, lineOwner, stepLine };
}
