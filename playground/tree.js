require({ baseUrl: "../third-party/treehugger/lib" }, [
"treehugger/tree",
"treehugger/traverse",
"treehugger/js/parse",
"jquery"],
function(tree, traverse, parsejs) {

	var analysisHelpers = {
		cssClasses: {
			'VarDecl(_)': "decl",
			'For(_,_,_,_)': "loop",
			'VarDeclInit(_,_)': "declInit",
			'While(_,_)': "loop",
			'ForIn(_,_,_)': "loop"
		},

		clearHighLight: function() {
			silentUpdate = true;
			var cursorPos = mainEditor.getCursor();
			mainEditor.setValue(mainEditor.getValue());
			mainEditor.setCursor(cursorPos);
			silentUpdate = false;
		},

		printQuery: function(ast, query) {
			log("========= " + query + " ========");
			ast.collectTopDown(
				query
			).log();
		},

		highLightQuery: function(ast, query) {
			var classes = analysisHelpers.cssClasses;
			ast.traverseTopDown(
				query,
				function(b, node) {
					var pos = node.getPos();
					log("highlight: " + JSON.stringify(pos));
					editor.markText(
						{line: pos.sl, ch: pos.sc},
						{line: pos.el, ch: pos.ec},
						(classes[query]) ? classes[query] : "marked"
					);
				}
			);
		},

		checkQuery: function(ast, query, cssClass) {
			analysisHelpers.printQuery(ast, query);
			analysisHelpers.highLightQuery(ast, query, cssClass);
		}
	}

	function clearLog() {
		outputEditor.setValue("");
	}

	function log(message) {
		outputEditor.setValue(outputEditor.getValue() + message + "\n");
		outputEditor.setCursor({
			line: outputEditor.lineCount() - 1,
			ch: 0
		});
	}

	function exec() {
		var js = mainEditor.getValue();
		var analysisJs = analysisEditor.getValue();
		clearLog();
		var ast = parsejs.parse(js);
		astEditor.setValue(ast.toPrettyString());
		try {
			// create closure in which to enable access to helpers
			(function (helpers) {
				// expand helpers
				for (var i in helpers) {
					eval("var " + i + " = " + "helpers." + i + ";");
				}
				clearHighLight();
				eval(analysisJs);
			})(analysisHelpers);
		} catch(e) {
			clearLog();
			log("JS Error");
			console.log(e.message)
		}
	}

	tree.Node.prototype.log = function() {
		log(this.toPrettyString());
	}

	function initEditor(elementId, config) {
		// the configurations that are not optional
		config.mode = "text/javascript";
		config.smartIndent = false;
		config.lineNumbers = true;
		config.onCursorActivity = function() {
			editor.setLineClass(hlLine, null, null);
			hlLine = editor.setLineClass(editor.getCursor().line, null, "activeline");
		};

		var editor = CodeMirror.fromTextArea(
			document.getElementById(elementId),
			config
		);
		var hlLine = editor.setLineClass(0, "activeline");
		return editor;
	}

	var mainEditor, astEditor, analysisEditor, outputEditor;
	var silentUpdate = false;

	require.ready(function() {
		CodeMirror.commands.autocomplete = function(cm) {
			CodeMirror.simpleHint(cm, CodeMirror.javascriptHint);
		}
		var foldFunc = CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder);
		// base configuration for the editors
		var baseConfig = {
			onGutterClick: foldFunc,
			extraKeys: {
				"Ctrl-Space": "autocomplete",
				"Ctrl-B": function() {
					exec();
				},
				"Shift-Ctrl-C": function(cm){
					foldFunc(cm, cm.getCursor().line);
				},
			}
		};
		// configuration for the editors
		// which will trigger parsing
		var parseTriggeringConfig = $.extend({
			onChange: function() {
				if (!silentUpdate) {
					exec();
				}
			}
		}, baseConfig);

		analysisEditor = initEditor("analysisEditor", baseConfig);
		window.editor = mainEditor = initEditor("mainEditor", parseTriggeringConfig);
		astEditor = initEditor("astEditor", {
			readOnly: true
		});
		outputEditor = initEditor("output", {
			readOnly: true
		});

		$("#runButton").click(function() { exec(); });

		exec();
	});
});