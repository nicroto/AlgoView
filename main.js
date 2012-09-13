require({ baseUrl: "third-party/treehugger/lib" }, [
"treehugger/tree",
"treehugger/traverse",
"treehugger/js/parse",
"jquery"],
function(tree, traverse, parsejs) {

	// varName = anything
	var REGEX_INPUT_ARGS = /([a-zA-Z][a-zA-Z0-9]*)[\s]*=[\s]*(.*)/g;

	function algoView(element, parser) {
		var self = this;
		self.element = element;
		self.parser = parser;
		self.mainEditor = null;
		self.inputEditor = null;
		self.algoViewEditor = null;
		self.initView();
	}
	algoView.prototype = {
		initView: function() {
			var self = this;
			var foldFunc = CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder);

			var mainConfig = {
				lineNumbers: true,

				onGutterClick: foldFunc,

				extraKeys: {
					"Shift-Ctrl-C": function(cm){
						foldFunc(cm, cm.getCursor().line);
					}
				},

				onChange: function() {
					self.refresh();
				}
			};

			self.mainEditor = self.initEditorOnClass(
				self.element,
				"main-editor",
				mainConfig
			);

			self.inputEditor = self.initEditorOnClass(
				self.element,
				"sample-input-editor",
				{
					onChange: function() {
						var refreshOnlyAlgoView = true;
						self.refresh(refreshOnlyAlgoView);
					}
				}
			);
			self.algoViewEditor = self.initEditorOnClass(
				self.element,
				"algo-view"
			);

			self.refresh();
		},

		initEditorOnClass: function(element, cssClass, config) {
			if (!config) config = {};
			// the configurations that are not optional
			config.mode = "text/javascript";
			config.smartIndent = false;
			config.indentWithTabs = true;
			config.onCursorActivity = function() {
				editor.setLineClass(hlLine, null, null);
				hlLine = editor.setLineClass(editor.getCursor().line, null, "activeline");
			};

			var editor = CodeMirror.fromTextArea(
				$("." + cssClass + " textarea", element)[0],
				config
			);
			var hlLine = editor.setLineClass(0, "activeline");
			return editor;
		},

		refresh: function(refreshOnlyAlgoView) {
			var self = this;
			var ast = self.parser.parse(self.mainEditor.getValue());

			self.renderData(
				self.processAst(ast),
				refreshOnlyAlgoView
			);
		},

		parseInputArgs: function(userText) {
			var self = this;
			var matches = [];
			var result = [];
			var match = REGEX_INPUT_ARGS.exec(userText);
			while (match !== null) {
				matches.push(match);
				match = REGEX_INPUT_ARGS.exec(userText);
			}
			for (var i = 0; i < matches.length; i++) {
				var entry = matches[i];
				var name = entry[1];
				var value = entry[2];
				if (value !== "?") {
					result.push(self.getUserInputEntry(
						name,
						value,
						true
					));
				}
			}
			return result;
		},

		processAst: function(ast) {
			var self = this;
			var data = {
				inputArgs: null,
				executionData: null
			};
			var functionNode = self.getMainFunctionNode(ast);
			if (functionNode) {
				var args = self.getArgumentsForInput(
					self.parseInputArgs(self.inputEditor.getValue()),
					functionNode
				);
				data.inputArgs = args;
/*				if (self.allArgumentsFilledByUser(args)) {
					var codeToExecute = self.plantMonitors(self.mainEditor, functionNode);
					data.executionData = self.mockAndExecuteClientCode(self.mainEditor, functionNode);
				}*/
			}
			return data;
		},

		getMainFunctionNode: function(ast) {
			var functions = [];
			ast.traverseTopDown(
				'Function(x, _, _)',
				function(b, node) {
					functions.push(node);
				}
			);
			return (functions.length > 0) ? functions[0] : null;
		},

		getArgumentsForInput: function(currentArgs, functionNode) {
			var self = this;
			var result = [];
			var argNodes = functionNode[1].toArray();
			var argNames = [];
			for (var i = 0; i < argNodes.length; i++) {
				argNames.push(argNodes[i][0].value);
			}
			for (var i = 0; i < currentArgs.length; i ++) {
				var arg = currentArgs[i];
				var index = argNames.indexOf(arg.name);
				if (index !== -1) {
					result.push(arg);
					argNames.splice(index, 1);
				}
			}
			for (var i = 0; i < argNames.length; i++) {
				result.push(self.getUserInputEntry(
					argNames[i],
					"?",
					false
				));
			}
			return result;
		},

		renderData: function(data, refreshOnlyAlgoView) {
			var self = this;
			if (!refreshOnlyAlgoView) {
				var userInputText = "";
				var inputArgs = data.inputArgs;

				for (var i = 0; i < inputArgs.length; i++) {
					var entry = inputArgs[i];
					userInputText += [
						entry.name,
						" = ",
						entry.value,
						"\n"
					].join("");
				}
				self.inputEditor.setValue(userInputText);
			}
			// TODO!
		},

		getUserInputEntry: function(name, value, isUserSet) {
			return {
				name: name,
				value: value,
				isUserSet: isUserSet
			};
		}
	};

	require.ready(function() {
		var view = new algoView($("#algoViewContainer")[0], parsejs);
	});
});