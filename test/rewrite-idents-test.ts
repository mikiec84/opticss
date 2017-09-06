import { suite, test, skip, only } from "mocha-typescript";
import { assert } from "chai";

import { OptimizationResult } from "../src/Optimizer";
import { TestTemplate } from "./util/TestTemplate";
import clean from "./util/clean";
import { testOptimizationCascade, CascadeTestResult } from "./util/assertCascade";
import { TemplateIntegrationOptions, RewritableIdents } from "../src/OpticssOptions";
import { IdentGenerator } from "../src/util/IdentGenerator";

function testRewriteIdents(templateRewriteOpts: RewritableIdents, ...stylesAndTemplates: Array<string | TestTemplate>): Promise<CascadeTestResult> {
  return testOptimizationCascade(
    { only: ["rewriteIdents"] },
    { rewriteIdents: templateRewriteOpts },
    ...stylesAndTemplates);
}

@suite("Rewrite idents")
export class RemoveUnusedStylesTest {
  @test "has an ident generator"() {
    const idGen = new IdentGenerator();
    assert.equal(idGen.nextIdent(), "a");
    assert.equal(idGen.nextIdent(), "b");
    for (let i = 2; i < 52; i ++) {
      idGen.nextIdent();
    }
    assert.equal(idGen.nextIdent(), "a0");
    for (let i = 1; i < 64; i ++) {
      idGen.nextIdent();
    }
    assert.equal(idGen.nextIdent(), "b0");
    for (let i = 1; i < 64 * 51; i ++) {
      idGen.nextIdent();
    }
    assert.equal(idGen.nextIdent(), "a00");
  }
  @test "rewrites idents"() {
    let css1 = `
      #id3 { border-width: 2px; }
      #id1 { color: blue; }
      .thing1 { color: red; }
      #id2 { width: 50%; }
      .thing2 { border: 1px solid blue; }
      .thing3 { background: red; }
      div { background-color: white; }
      #id3.thing4 { border-color: black; }
    `;
    let template = new TestTemplate("test", clean`
      <div class="(thing3 | thing1)" id="(id1 | id2)"></div>
      <div class="(--- | thing2 | thing4)" id="id3"></div>
    `);
    return testRewriteIdents({id: true, class: true}, css1, template).then(result => {
      let replaced = Object.keys(result.optimization.styleMapping.replacedAttributes);
      assert.equal(replaced.length, 7);
      // debugResult(css1, result);
    });
  }
  @test "can disable id rewriting"() {
    let css1 = `
      #id3 { border-width: 2px; }
      #id1 { color: blue; }
      .thing1 { color: red; }
      #id2 { width: 50%; }
      .thing2 { border: 1px solid blue; }
      .thing3 { background: red; }
      div { background-color: white; }
      #id3.thing4 { border-color: black; }
    `;
    let template = new TestTemplate("test", clean`
      <div class="(thing3 | thing1)" id="(id1 | id2)"></div>
      <div class="(--- | thing2 | thing4)" id="id3"></div>
    `);
    return testRewriteIdents({id: false, class: true}, css1, template).then(result => {
      let id1rw = result.optimization.styleMapping.getRewriteOf({name: "id", value: "id1"});
      assert.isUndefined(id1rw);
      let thing1rw = result.optimization.styleMapping.getRewriteOf({name: "class", value: "thing1"});
      assert.isDefined(thing1rw);
    });
  }
  @test "can disable class rewriting"() {
    let css1 = `
      #id3 { border-width: 2px; }
      #id1 { color: blue; }
      .thing1 { color: red; }
      #id2 { width: 50%; }
      .thing2 { border: 1px solid blue; }
      .thing3 { background: red; }
      div { background-color: white; }
      #id3.thing4 { border-color: black; }
    `;
    let template = new TestTemplate("test", clean`
      <div class="(thing3 | thing1)" id="(id1 | id2)"></div>
      <div class="(--- | thing2 | thing4)" id="id3"></div>
    `);
    return testRewriteIdents({id: true, class: false}, css1, template).then(result => {
      let id1rw = result.optimization.styleMapping.getRewriteOf({name: "id", value: "id1"});
      assert.isDefined(id1rw);
      let thing1rw = result.optimization.styleMapping.getRewriteOf({name: "class", value: "thing1"});
      assert.isUndefined(thing1rw);
    });
  }
}

function indentString(str: string, indent = "  ") {
 return indent + str.split("\n").join("\n" + indent);
}

function debugResult(inputCSS: string, result: CascadeTestResult) {
  console.log("Input CSS:", "\n" + indentString(inputCSS));
  console.log("Optimized CSS:", "\n" + indentString(result.optimization.output.content.toString()));
  result.templateResults.forEach(templateResult => {
    console.log("Template:", "\n" + indentString(templateResult.template));
    templateResult.rewrites.forEach(rewrite => {
      console.log("Rewritten to:", "\n" + indentString(rewrite));
    });
  });
}
