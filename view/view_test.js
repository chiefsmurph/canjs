require('can/view/view');
require('can/view/callbacks/callbacks');
require('can/view/stache/stache');
require('can/map/map');
require('can/util/fixture/fixture');
require('can/test/test');
require('steal-qunit');

var restoreInfo = [];

var copy = function(source){
	var copied = can.isArray(source) ? source.slice(0) : can.extend({}, source);

	restoreInfo.push({source: source, copy: copied});
};

var restore = function(){
	can.each(restoreInfo, function(data){
		if(can.isArray(data.source) ) {

			data.source.splice(0, data.source.length);
			data.source.push.apply(data.source, data.copy);
		} else {
			for(var prop in data.source) {
				delete data.source[prop];
			}
			can.extend(data.source, data.copy);
		}

	});
};

var getStringResult = function (src) {
	var result;
	if (typeof src === "string") {
		result = src;
	}
	else if (src.toString() === "[object DocumentFragment]") {
		var div = document.createElement("div");
		div.appendChild(src);
		result = div.innerHTML;
	}
	return can.trim(result);
};

QUnit.module('can/view', {
	setup: function () {
		copy(can.view.callbacks._attributes);
		copy(can.view.callbacks._regExpAttributes);
		copy(can.view.callbacks._tags);
	},
	teardown: function () {
		restore();
	}
});


test('basic loading', function(){
	var data = {message: "hello"},
		expected = "<h1>hello</h1>",
		templates= {
			"stache": "<h1>{{message}}</h1>"
		},
		templateUrl = function(ext){
			return can.test.path('view/test/basic_loading.' + ext);
		};
	can.each([
		'stache'
	], function (ext) {



		var result = can.view( templateUrl(ext), data );
		equal(result.childNodes[0].nodeName.toLowerCase(), "h1", ext+" can.view(url,data) "+"got an h1");
		equal(result.childNodes[0].innerHTML, "hello", ext+" can.view(url,data) "+"innerHTML");

		result = can.view( templateUrl(ext) )(data);
		equal(result.childNodes[0].nodeName.toLowerCase(), "h1", ext+" can.view(url)(data) "+"got an h1");
		equal(result.childNodes[0].innerHTML, "hello", ext+" can.view(url)(data) "+"innerHTML");

		result = can.view( templateUrl(ext) )(data);
		equal(result.childNodes[0].nodeName.toLowerCase(), "h1", ext+" can.view(url)(data) "+"got an h1");
		equal(result.childNodes[0].innerHTML, "hello", ext+" can.view(url)(data) "+"innerHTML");

		result = can[ext]( templates[ext ])(data);
		equal(result.childNodes[0].nodeName.toLowerCase(), "h1", ext+" can."+ext+"(template)(data) "+"got an h1");
		equal(result.childNodes[0].innerHTML, "hello", ext+" can."+ext+"(template)(data) "+"innerHTML");


		if(ext !== "stache") {
			result = can.view( templateUrl(ext) ).render( data );
			equal(result, expected, ext+" can.view(url).renderer(data) "+"result");

			result = can[ext]( templates[ext ] ).render( data );
			equal(result, expected, ext+" can."+ext+"(template).renderer(data) "+"result");
		}
	});
});

test('helpers work', function () {
	var expected = '<h3>helloworld</h3><div>foo</div>';

	can.each([
		'stache'
	], function (ext, i) {
		var actual = can.view.render(can.test.path('view/test/helpers.' + ext), {
			'message': 'helloworld'
		}, {
			helper: function () {
				return 'foo';
			}
		});
		equal(getStringResult(actual), expected, 'Text rendered');
	});

});

test('async templates, and caching work', function () {
	stop();
	var i = 0;
	can.view.render(can.test.path('view/test/temp.stache'), {
		'message': 'helloworld'
	}, function (result) {
		var text = getStringResult(result);
		ok(/helloworld\s*/.test(text), 'we got a rendered template');
		i++;
		equal(i, 2, 'Ajax is not synchronous');
		start();
	});
	i++;
	equal(i, 1, 'Ajax is not synchronous');
});

test('caching works', function () {
	// this basically does a large ajax request and makes sure
	// that the second time is always faster
	stop();
	var first;
	can.view.render(can.test.path('view/test/large.stache'), {
		'message': 'helloworld'
	}, function (text) {
		first = new Date();
		ok(text, 'we got a rendered template');
		can.view.render(can.test.path('view/test/large.stache'), {
			'message': 'helloworld'
		}, function (text) {
			/*
			 var lap2 = new Date() - first,
			 lap1 = first - startT;
			 ok( lap1 > lap2, "faster this time "+(lap1 - lap2) )
			 */
			start();
		});
	});
});

test('inline templates other than \'tmpl\'', function () {
	var script = document.createElement('script');
	script.setAttribute('type', 'test/stach');
	script.setAttribute('id', 'test_stache');
	script.text = '<span id="new_name">{{name}}</span>';
	document.getElementById('qunit-fixture')
		.appendChild(script);
	var div = document.createElement('div');
	div.appendChild(can.view('test_stache', {
		name: 'Henry'
	}));
	equal(div.getElementsByTagName('span')[0].firstChild.nodeValue, 'Henry');
});

//canjs issue #31
test('render inline templates with a #', function () {
	var script = document.createElement('script');
	script.setAttribute('type', 'test/stache');
	script.setAttribute('id', 'test_stache');
	script.text = '<span id="new_name">{{name}}</span>';
	document.getElementById('qunit-fixture')
		.appendChild(script);
	var div = document.createElement('div');
	div.appendChild(can.view('#test_stache', {
		name: 'Henry'
	}));
	//make sure we aren't returning the current document as the template
	equal(div.getElementsByTagName('script')
		.length, 0, 'Current document was not used as template');
	if (div.getElementsByTagName('span')
		.length === 1) {
		equal(div.getElementsByTagName('span')[0].firstChild.nodeValue, 'Henry');
	}
});
test('object of deferreds', function () {
	var foo = new can.Deferred(),
		bar = new can.Deferred();
	stop();
	can.view.render(can.test.path('view/test/deferreds.stache'), {
		foo: typeof foo.promise === 'function' ? foo.promise() : foo,
		bar: bar
	})
	.then(function (result) {
		equal(getStringResult(result), 'FOO and BAR');
		start();
	});
	setTimeout(function () {
		foo.resolve('FOO');
	}, 100);
	bar.resolve('BAR');
});
test('deferred', function () {
	var foo = new can.Deferred();
	stop();
	can.view.render(can.test.path('view/test//deferred.stache'), foo)
	.then(function (result) {
		equal(getStringResult(result), 'FOO');
		start();
	});
	setTimeout(function () {
		foo.resolve({
			foo: 'FOO'
		});
	}, 100);
});
test('hyphen in type', function () {
	var script = document.createElement('script');
	script.setAttribute('type', 'text/x-stache');
	script.setAttribute('id', 'hyphenStache');
	script.text = '\nHyphen\n';
	document.getElementById('qunit-fixture')
		.appendChild(script);
	var div = document.createElement('div');
	div.appendChild(can.view('hyphenStache', {}));
	ok(/Hyphen/.test(div.innerHTML), 'has hyphen');
});
test('create template with string', function () {
	can.view.stache('fool', 'everybody plays the {{who}} {{howOften}}');
	var div = document.createElement('div');
	div.appendChild(can.view('fool', {
		who: 'fool',
		howOften: 'sometimes'
	}));
	ok(/fool sometimes/.test(div.innerHTML), 'has fool sometimes' + div.innerHTML);
});
test('return renderer', function () {
	var directResult = can.view.stache('renderer_test', 'This is a {{test}}');
	var renderer = can.view('renderer_test');
	ok(can.isFunction(directResult), 'Renderer returned directly');
	ok(can.isFunction(renderer), 'Renderer is a function');
	equal(getStringResult(renderer({
		test: 'working test'
	})), 'This is a working test', 'Rendered');
	renderer = can.view(can.test.path('view/test/template.stache'));
	ok(can.isFunction(renderer), 'Renderer is a function');
	equal(getStringResult(renderer({
		message: 'Rendered!'
	})), '<h3>Rendered!</h3>', 'Synchronous template loaded and rendered'); // TODO doesn't get caught in Zepto for whatever reason
	// raises(function() {
	//      can.view('jkflsd.stache');
	// }, 'Nonexistent template throws error');
});
test('nameless renderers (#162, #195)', 3, function () {
	var nameless = can.stache('<h2>{{message}}</h2>'),
		data = {
			message: 'HI!'
		},
		result = nameless(data),
		node = result.childNodes[0];
	ok('ownerDocument' in result, 'Result is a document fragment');
	equal(node.tagName.toLowerCase(), 'h2', 'Got h2 rendered');
	equal(node.innerHTML, data.message, 'Got result rendered');
});
test('deferred resolves with data (#183, #209)', function () {
	var foo = new can.Deferred();
	var bar = new can.Deferred();
	var original = {
		foo: foo,
		bar: bar
	};
	stop();
	ok(can.isDeferred(original.foo), 'Original foo property is a Deferred');
	can.view(can.test.path('view/test/deferred.stache'), original)
	.then(function (result, data) {
		ok(data, 'Data exists');
		equal(data.foo, 'FOO', 'Foo is resolved');
		equal(data.bar, 'BAR', 'Bar is resolved');
		ok(can.isDeferred(original.foo), 'Original property did not get modified');
		start();
	});
	setTimeout(function () {
		foo.resolve('FOO');
	}, 100);
	setTimeout(function () {
		bar.resolve('BAR');
	}, 50);
});
test('Empty model displays __!!__ as input values (#196)', function () {
	can.view.stache('test196', 'User id: {{user.id}}' + ' User name: {{user.name}}');
	var frag = can.view('test196', {
		user: new can.Map()
	});
	var div = document.createElement('div');
	div.appendChild(frag);
	equal(div.innerHTML, 'User id:  User name: ', 'Got expected HTML content');
	can.view('test196', {
		user: new can.Map()
	}, function (frag) {
		div = document.createElement('div');
		div.appendChild(frag);
		equal(div.innerHTML, 'User id:  User name: ', 'Got expected HTML content in callback as well');
	});
});
test('Select live bound options don\'t contain __!!__', function () {
	var domainList = new can.List([{
		id: 1,
		name: 'example.com'
	}, {
		id: 2,
		name: 'google.com'
	}, {
		id: 3,
		name: 'yahoo.com'
	}, {
		id: 4,
		name: 'microsoft.com'
	}]),
		frag = can.view(can.test.path('view/test/select.stache'), {
			domainList: domainList
		}),
		div = document.createElement('div');

	div.appendChild(frag);

	can.append(can.$('#qunit-fixture'), div);

	equal(div.outerHTML.match(/__!!__/g), null, 'No __!!__ contained in HTML content');
});
test('Live binding on number inputs', function () {
	var template = can.stache('<input id="candy" type="number" {($value)}="number" />');
	var observe = new can.Map({
		number: 2
	});
	var frag = template(observe);

	can.append(can.$('#qunit-fixture'), frag);
	var input = document.getElementById('candy');
	equal(input.getAttribute('value'), 2, 'render workered');
	observe.attr('number', 5);
	equal(input.getAttribute('value'), 5, 'update workered');
});

test('live binding textNodes before a table', function(){
	var data = new can.Map({
		loading: true
	}),
		templates = {
			"stache": "{{#if state.loading}}Loading{{else}}Loaded{{/if}}<table><tbody><tr></tr></tbody></table>"
		};
	can.each([
		'stache'
	], function (ext) {

		var result = can[ext]( templates[ext])({state: data});
		equal(result.childNodes.length, 2, "can."+ext+"(template)(data) "+"proper number of nodes");
		equal(result.childNodes[0].nodeType, 3, "can."+ext+"(template)(data) "+"got text node");
		equal(result.childNodes[0].nodeValue, "Loading", "can."+ext+"(template)(data) "+"got live bound text value");
		equal(result.childNodes[1].nodeName.toLowerCase(), "table", ext+" can."+ext+"(template)(data) "+"innerHTML");

	});

});
test('Resetting a live-bound <textarea> changes its value to __!!__ (#223)', function () {
	var template = can.view.stache('<form><textarea>{{test}}</textarea></form>'),
		frag = template(new can.Map({
			test: 'testing'
		})),
		form,
		textarea;
	can.append(can.$('#qunit-fixture'), frag);
	form = document.getElementById('qunit-fixture')
		.getElementsByTagName('form')[0];
	textarea = form.children[0];
	equal(textarea.value, 'testing', 'Textarea value set');
	textarea.value = 'blabla';
	equal(textarea.value, 'blabla', 'Textarea value updated');
	form.reset();
	equal(form.children[0].value, 'testing', 'Textarea value set back to original live-bound value');
});
test('Deferred fails (#276)', function () {
	var foo = new can.Deferred();
	stop();
	can.view.render(can.test.path('view/test/deferred.stache'), foo)
	.fail(function (error) {
		equal(error.message, 'Deferred error');
		start();
	});
	setTimeout(function () {
		foo.reject({
			message: 'Deferred error'
		});
	}, 100);
});
test('Object of deferreds fails (#276)', function () {
	var foo = new can.Deferred(),
		bar = new can.Deferred();
	stop();
	can.view.render(can.test.path('view/test//deferreds.stache'), {
		foo: typeof foo.promise === 'function' ? foo.promise() : foo,
		bar: bar
	})
	.fail(function (error) {
		equal(error.message, 'foo error');
		start();
	});
	setTimeout(function () {
		foo.reject({
			message: 'foo error'
		});
	}, 100);
	bar.resolve('Bar done');
});

test('Using \'=\' in attribute does not truncate the value', function () {
	var template = can.stache('<img id=\'equalTest\' {{class}} src="{{src}}">'),
		obs = new can.Map({
			'class': 'class="someClass"',
			'src': 'http://canjs.us/scripts/static/img/canjs_logo_yellow_small.png'
		}),
		frag = template(obs),
		img;
	can.append(can.$('#qunit-fixture'), frag);
	img = document.getElementById('equalTest');
	obs.attr('class', 'class="do=not=truncate=me"');
	obs.attr('src', 'http://canjs.us/scripts/static/img/canjs_logo_yellow_small.png?wid=100&wid=200');
	equal(img.className, 'do=not=truncate=me', 'class is right');
	equal(img.src, 'http://canjs.us/scripts/static/img/canjs_logo_yellow_small.png?wid=100&wid=200', 'attribute is right');
});

test("basic scanner custom tags", function () {

	can.view.tag("panel", function (el, tagData) {

		ok(tagData.options.attr('helpers.myhelper')(), "got a helper");
		equal(tagData.scope.attr('foo'), "bar", "got scope and can read from it");
		equal(getStringResult(tagData.subtemplate(tagData.scope.add({
			message: "hi"
		})), tagData.options), "<p>sub says hi</p>");

	});

	var template = can.stache("<panel title='foo'><p>sub says {{message}}</p></panel>");

	template({
		foo: "bar"
	}, {
		myhelper: function () {
			return true;
		}
	});

});

test("custom tags without subtemplate", function () {
	can.view.tag("empty-tag", function (el, tagData) {

		ok(!tagData.subtemplate, "There is no subtemplate");

	});

	var template = can.stache("<empty-tag title='foo'></empty-tag>");

	template({
		foo: "bar"
	});
});

test("sub hookup", function () {
	var tabs = document.createElement("tabs");

	document.body.appendChild(tabs);

	var panel = document.createElement("panel");

	document.body.appendChild(panel);

	can.view.tag("tabs", function (el, tagData) {
		var frag = can.view.frag(tagData.subtemplate(tagData.scope, tagData.options));

		var div = document.createElement("div");
		div.appendChild(frag);
		var panels = div.getElementsByTagName("panel");
		equal(panels.length, 1, "there is one panel");
		equal(panels[0].nodeName.toUpperCase(), "PANEL");
		equal(panels[0].getAttribute("title"), "Fruits", "attribute left correctly");
		equal(panels[0].innerHTML, "oranges, apples", "innerHTML");

	});

	can.view.tag("panel", function (el, tagData) {
		ok(tagData.scope, "got scope");
		return tagData.scope;

	});

	var template = can.stache("<tabs>" +
		"{{#each foodTypes}}" +
		"<panel title='{{title}}'>{{content}}</panel>" +
		"{{/each}}" +
		"</tabs>");

	var foodTypes = new can.List([{
			title: "Fruits",
			content: "oranges, apples"
		} //,
		//{title: "Breads", content: "pasta, cereal"},
		//{title: "Sweets", content: "ice cream, candy"}
	]);

	template({
		foodTypes: foodTypes
	});

});

test("sub hookup passes helpers", function () {

	can.view.tag("tabs", function (el, tagData) {

		var optionsScope = tagData.options.add({
			tabsHelper: function () {
				return "TabsHelper";
			}
		});
		var frag = can.view.frag(tagData.subtemplate(tagData.scope, optionsScope));
		var div = document.createElement("div");
		div.appendChild(frag);
		var panels = div.getElementsByTagName('panel');
		equal(panels.length, 1, 'there is one panel');
		equal(panels[0].nodeName.toUpperCase(), 'PANEL');
		equal(panels[0].getAttribute('title'), 'Fruits', 'attribute left correctly');
		equal(panels[0].innerHTML, 'TabsHelperoranges, apples', 'innerHTML');
	});

	can.view.tag("panel", function (el, tagData) {
		ok(tagData.scope, "got scope");
		return tagData.scope;

	});

	var template = can.stache("<tabs>" +
		"{{#each foodTypes}}" +
		"<panel title='{{title}}'>{{tabsHelper}}{{content}}</panel>" +
		"{{/each}}" +
		"</tabs>");

	var foodTypes = new can.List([{
			title: "Fruits",
			content: "oranges, apples"
		} //,
		//{title: "Breads", content: "pasta, cereal"},
		//{title: "Sweets", content: "ice cream, candy"}
	]);

	template({
		foodTypes: foodTypes
	});
});

test('attribute matching', function () {
	var item = 0;

	can.view.attr("on-click", function (el, attrData) {

		ok(true, "attribute called");
		equal(attrData.attributeName, "on-click", "attr is on click");
		equal(el.nodeName.toLowerCase(), "p", "got a paragraph");
		var cur = attrData.scope.attr(".");
		equal(foodTypes[item], cur, "can get the current scope");
		var attr = el.getAttribute("on-click");

		equal(attrData.scope.get(attr,{proxyMethods: false}), doSomething, "can call a parent's function");
		item++;
	});
	var template = can.stache('<div>' + '{{#each foodTypes}}' + '<p on-click=\'doSomething\'>{{content}}</p>' + '{{/each}}' + '</div>');
	var foodTypes = new can.List([{
		title: 'Fruits',
		content: 'oranges, apples'
	}, {
		title: 'Breads',
		content: 'pasta, cereal'
	}, {
		title: 'Sweets',
		content: 'ice cream, candy'
	}]);
	var doSomething = function () {};
	template({
		foodTypes: foodTypes,
		doSomething: doSomething
	});
});

test('regex attribute matching', function () {
	var item = 0;

	can.view.attr(/on-[\w\.]+/, function (el, attrData) {

		ok(true, "attribute called");
		equal(attrData.attributeName, "on-click", "attr is on click");
		equal(el.nodeName.toLowerCase(), "p", "got a paragraph");

		var cur = attrData.scope.attr(".");

		equal(foodTypes[item], cur, "can get the current scope");

		var attr = el.getAttribute("on-click");

		equal(attrData.scope.get(attr,{proxyMethods: false}), doSomething, "can call a parent's function");

		item++;
	});

	var template = can.stache('<div>' + '{{#each foodTypes}}' + '<p on-click=\'doSomething\'>{{content}}</p>' + '{{/each}}' + '</div>');

	var foodTypes = new can.List([{
		title: 'Fruits',
		content: 'oranges, apples'
	}, {
		title: 'Breads',
		content: 'pasta, cereal'
	}, {
		title: 'Sweets',
		content: 'ice cream, candy'
	}]);

	var doSomething = function () {};

	template({
		foodTypes: foodTypes,
		doSomething: doSomething
	});
});

test('content element', function () {
	var template = can.stache('{{#foo}}<content></content>{{/foo}}');
	var context = new can.Map({
		foo: 'bar'
	});
	can.view.tag("content", function (el, options) {
		equal(el.nodeName.toLowerCase(), 'content', 'got an element');
		equal(options.scope.attr('.'), 'bar', 'got the context of content');
		el.innerHTML = 'updated';
	});

	var frag = template(context);
	equal(frag.childNodes[0].nodeName.toLowerCase(), 'content', "found content element");
	equal(frag.childNodes[0].innerHTML, 'updated', 'content is updated');

	context.removeAttr('foo');
	equal(frag.childNodes[0].nodeType, 3, 'only a text element remains');
	context.attr('foo', 'bar');
	equal(frag.childNodes[0].nodeName.toLowerCase(), 'content');
	equal(frag.childNodes[0].innerHTML, 'updated', 'content is updated');
});

test("content element inside tbody", function () {
	var template = can.stache("<table><tbody><content></content></tbody></table>");

	var context = new can.Map({
		foo: "bar"
	});

	can.view.tag("content", function (el, options) {
		equal(el.parentNode.nodeName.toLowerCase(), "tbody", "got an element in a tbody");
		equal(options.scope.attr('.'), context, "got the context of content");
	});
	template(context);
});

test('extensionless views, enforcing engine (#193)', 1, function () {
	var path = can.test.path('view/test/extensionless');
	// Because we don't have an extension and if we are using Steal we will get
	// view/test/extensionless/extensionless.js which we need to fix in this case
	if (path.indexOf('.js', this.length - 3) !== -1) {
		path = path.substring(0, path.lastIndexOf('/'));
	}
	var frag = can.view({
		url: path,
		engine: 'stache'
	}, {
		message: 'Hi test'
	});
	var div = document.createElement('div');
	div.appendChild(frag);
	equal(div.getElementsByTagName('h3')[0].innerHTML, 'Hi test', 'Got expected test from extensionless template');
});

test('can.view[engine] always returns fragment renderers (#485)', 2, function () {
	var template = '<h1>{{message}}</h1>';
	var withId = can.stache('test-485', template);
	var withoutId = can.stache(template);
	ok(withoutId({
			message: 'Without id'
		})
		.nodeType === 11, 'View without id returned document fragment');
	ok(withId({
			message: 'With id'
		})
		.nodeType === 11, 'View with id returned document fragment');
});
test('create a template before the custom element works with slash and colon', function () {
	if (window.html5) {
		// Calling this here causes odd syntax errors in old IE
		// window.html5.elements += ' ignore-this';
		// window.html5.shivDocument();
		// Skip instead for now
		ok(true, 'Old IE');
		return;
	}

	can.stache("theid", "<unique-name></unique-name><can:something></can:something><ignore-this>content</ignore-this>");

	can.view.tag("unique-name", function (el, tagData) {
		ok(true, "unique-name called!");
	});

	can.view.tag("can:something", function (el, tagData) {
		ok(true, "can:something called!");
	});
	can.view('theid', {});
});

test('loaded live element test', function () {
	// all custom elements must be registered for IE to work
	if (window.html5) {
		window.html5.elements += ' my-el';
		window.html5.shivDocument();
	}
	var t = can.stache('<div><my-el {{#if foo}}checked{{/if}} class=\'{{bar}}\' >inner</my-el></div>');
	t();
	ok(true);
});

test('content within non-component tags gets rendered with context', function () {
	// all custom elements must be registered for IE to work
	if (window.html5) {
		window.html5.elements += ' unique-element-name';
		window.html5.shivDocument();
	}
	var tmp = can.stache('<div><unique-element-name>{{name}}</unique-element-name></div>');
	var frag = tmp({
		name: 'Josh M'
	});
	equal(frag.childNodes[0].childNodes[0].innerHTML, 'Josh M', 'correctly retrieved scope data');
});

test('empty non-component tags', function () {
	// all custom elements must be registered for IE to work
	if (window.html5) {
		window.html5.elements += ' unique-element-name';
		window.html5.shivDocument();
	}
	var tmp = can.stache('<div><unique-element-name></unique-element-name></div>');
	tmp();
	ok(true, 'no error');
});




if (window.require) {
	if (window.require.config && window.require.toUrl) {
		test('template files relative to requirejs baseUrl (#647)', function () {
			can.view.ext = '.stache';

			var oldBaseUrl = window.requirejs.s.contexts._.config.baseUrl;
			window.require.config({
				baseUrl: oldBaseUrl + '/view/test/'
			});
			ok(can.isFunction(can.view('template')));
			window.require.config({
				baseUrl: oldBaseUrl
			});
		});
	}
}
test('should not error with IE conditional compilation turned on (#679)', function(){
	var pass = true;
	/*@cc_on @*/
	var template = can.stache('Hello World');
	try {
		template({});
	} catch(e) {
		pass = false;
	}
	ok(pass);
});
test('renderer passed with Deferred gets executed (#1139)', 1, function() {
	// See http://jsfiddle.net/a35ZH/1/
	var template = can.stache('<h1>Value is {{value}}!</h1>');
	var def = can.Deferred();

	stop();

	setTimeout(function() {
		def.resolve({
			value: 'Test'
		});
	}, 50);

	can.view(template, def, function (frag) {
		equal(frag.childNodes[0].innerHTML, 'Value is Test!');
		start();
	});
});

test('live lists are rendered properly when batch updated (#680)', function () {
	var div1 = document.createElement('div'),
		template = "{{#if items.length}}<ul>{{#each items}}<li>{{.}}</li>{{/each}}</ul>{{/if}}",
		stacheTempl = can.stache(template);

	var data = {
		items: new can.List()
	};

	div1.appendChild(stacheTempl(data));

	can.batch.start();
	for (var i=1; i<=3; i++) {
		data.items.push(i);
	}
	can.batch.stop();

	var getLIText = function(el) {
		var items = el.querySelectorAll('li');
		var text = '';

		can.each(items, function(item) {
			text += item.firstChild.data;
		});

		return text;
	};

	equal(getLIText(div1), "123", "Batched lists rendered properly with stache.");
});

test('hookups on self-closing elements do not leave orphaned @@!!@@ text content (#1113)', function(){
	var
		list = new can.List([{},{}]),
		templates = {
			"stache"   : "<table><colgroup>{{#list}}<col/>{{/list}}</colgroup></table>"
		};

	can.each([
		"stache"
	], function (ext) {
		var
			frag = can[ext](templates[ext])({ list : list }),
			div  = document.createElement("div");

		div.appendChild(frag);

		equal(div.querySelectorAll("col").length, 2, "Hookup with self-closing tag rendered properly with " + ext );
		equal(div.innerHTML.indexOf("@@!!@@"), -1, "Hookup with self-closing tag did not leave orphaned @@!!@@ text content with " + ext );
	});

});
