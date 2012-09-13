require({ baseUrl: "../third-party/treehugger/lib" }, [
"treehugger/tree",
"treehugger/traverse",
"treehugger/js/parse",
"jquery"],
function(tree, traverse, parsejs) {

	function log(message) {
		$("#output").val($("#output").val() + message + "\n");
	}

	function exec() {
		var js = mainEditor.getValue();
		var analysisJs = analysisEditor.getValue();
		$("#output").val("");
		var ast = parsejs.parse(js);
		astEditor.setValue(ast.toPrettyString());
		try {
			eval(analysisJs);
		} catch(e) {
			$("#output").val("JS Error");
			console.log(e.message)
		}
	}

	tree.Node.prototype.log = function() {
		$("#output").val(this.toPrettyString());
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

	var mainEditor, astEditor, analysisEditor;

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
		mainEditor = initEditor("mainEditor", parseTriggeringConfig);
		astEditor = initEditor("astEditor", {
			readOnly: true
		});

		$("#runButton").click(function() { exec(); });

		exec();
	});
});