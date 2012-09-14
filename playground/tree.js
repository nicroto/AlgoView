require({ baseUrl: "../third-party/treehugger/lib" }, [
"treehugger/tree",
"treehugger/traverse",
"treehugger/js/parse",
"jquery"],
function(tree, traverse, parsejs) {

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
			eval(analysisJs);
		} catch(e) {
			clearLog();
			log("JS Error");
			console.log(e.message)
		}
	}

	tree.Node.prototype.log = function() {
		clearLog();
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
				"Shift-Ctrl-C": function(cm){
					foldFunc(cm, cm.getCursor().line);
				}
			}
		};
		// configuration for the editors
		// which will trigger parsing
		var parseTriggeringConfig = $.extend({
			onChange: function() {
				exec();
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