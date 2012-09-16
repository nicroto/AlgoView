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
			var foldFunc = CodeMirror.newFoldFunction(
				CodeMirror.braceRangeFinder
			);

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
				hlLine = editor.setLineClass(
					editor.getCursor().line,
					null,
					"activeline"
				);
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
			var funcNode = self.getMainFunctionNode(ast);
			if (funcNode) {
				var args = self.getArgumentsForInput(
					self.parseInputArgs(self.inputEditor.getValue()),
					funcNode
				);
				data.inputArgs = args;
				if (self.allArgumentsFilledByUser(args)) {
					var codeToExecute = self.plantMonitors(
						self.mainEditor.getValue("\n"),
						funcNode
					);
					self.algoViewEditor.setValue(codeToExecute);
					/*data.executionData = self.collectExecutionData(
						self.mainEditor,
						funcNode
					);*/
				}
			}
			return data;
		},

		plantMonitors: function(code, funcNode) {
			var lines = code.split("\n");
			var self = this;
			lines = $.map(lines, function(line, index) {
				return { line: index, text: line, monitors: [] };
			});
			var monitors = self.getVarDeclsTracks(funcNode, 'VarDecls(_)');
				// .concat(self.getVarAlterTracks(funcNode, 'PrefixOp(_,x)'))
				// .concat(self.getVarAlterTracks(funcNode, 'PostfixOp(_,x)'))
				// .concat(self.getVarAlterTracks(funcNode, 'Assign(x,_)'));
				// .concat(self.getLoopTracks(funcNode, 'For(_,_,_,_)'))
				// .concat(self.getLoopTracks(funcNode, 'While(_,_)'))
				// .concat(self.getLoopTracks(funcNode, 'ForIn(_,_,_)'))
				// .concat(self.getReturnTracks(funcNode, 'Return(x)'));
			for (var i = 0; i < monitors.length; i++) {
				var entry = monitors[i];
				lines[entry.line].monitors.push(entry);
			}
			var newLines = [];
			for (var i = 0; i < lines.length; i++) {
				newLines.push(self.insertMonitors(lines[i]));
			}
			return newLines.join("\n");
		},

		insertMonitors: function(line) {
			var lineText = line.text;
			var monitors = line.monitors.sort(function(a, b) {
				return a.ch > b.ch;
			});
			var previousLines = [];
			var nextLines = [];
			var toInsert = [];
			for (var i = 0; i < monitors.length; i++) {
				var monitor = monitors[i];
				var charIndex = monitor.ch;
				var monitorText = monitor.text;
				switch(monitor.insertAt) {
					case "previousLine":
						previousLines.push(monitorText);
						break;

					case "sameLine":
						toInsert.push({
							index: charIndex,
							text: monitorText
						});
						break;

					case "nextLine":
						nextLines.push(monitorText);
						break;
				}
			}
			var lineParts = [];
			var currentIndex = 0;
			for (var i = 0; i < toInsert.length; i++) {
				var entry = toInsert[i];
				var skipped = lineText.slice(currentIndex, entry.index);
				lineParts.push(skipped);
				lineParts.push(entry.text);
			}
			lineParts.push(lineText.slice(currentIndex, lineText.length - currentIndex));
			return (previousLines
				.concat([lineParts.join("")])
				.concat(nextLines))
					.join("\n");
		},

		getReturnTracks: function(funcNode, query) {
			var self = this;
			var monitors = [];
			var trackFunc = function(b, node) {
				var value = b.x.value;
				var pos = self.getReturnTrackPos(node);
				monitors.push({
					line: pos.line,
					ch: pos.ch,
					insertAt: "sameLine",
					text: "algoViewProxy.trackReturn(" + value + ");"
				});
			};
			funcNode.traverseTopDown(
				query,
				trackFunc
			);
			return monitors;
		},

		getLoopTracks: function(funcNode, query) {
			var self = this;
			var monitors = [];
			var trackFunc = function(b, node) {
				var startTrackPos = self.getLoopStartTrackPos(node);
				var endTrackPos = self.getLoopEndTrackPos(node);
				monitors.push({
					line: startTrackLoop.line,
					ch: startTrackPos.ch,
					insertAt: "previousLine",
					text: "algoViewProxy.startTrackLoop();"
				});
				monitors.push({
					line: endTrackPos.line,
					ch: endTrackPos.ch,
					insertAt: "nextLine",
					text: "algoViewProxy.endTrackLoop();"
				});
			};
			funcNode.traverseTopDown(
				query,
				trackFunc
			);
			return monitors;
		},

		getVarAlterTracks: function(funcNode, query) {
			var self = this;
			var monitors = [];
			var trackFunc = function(b, node) {
				var varName = b.x.value;
				var pos = self.getVarTrackPos(node);
				monitors.push({
					line: pos.line,
					ch: pos.ch,
					insertAt: "nextLine",
					text: "algoViewProxy.trackVariableAlter('" + varName + "', " + varName + ");"
				});
			};
			funcNode.traverseTopDown(
				query,
				trackFunc
			);
			return monitors;
		},

		getVarDeclsTracks: function(funcNode, query) {
			var self = this;
			var monitors = [];
			var trackFunc = function(b, node) {
				var line = node.getPos().el;
				var decls = node[0];
				for (var i = 0; i < decls.length; i++) {
					var varName = decls[i][0].value;
					monitors.push({
						line: line,
						insertAt: "nextLine",
						text: "algoViewProxy.trackVariableDeclaration('" + varName + "', " + varName + ");"
					});
				}
			};
			funcNode.traverseTopDown(
				query,
				trackFunc
			);
			return monitors;
		},

		allArgumentsFilledByUser: function(args) {
			for (var i = 0; i < args.length; i++) {
				if (!args[i].isUserSet) {
					return false;
				}
			}
			return true;
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

		getArgumentsForInput: function(currentArgs, funcNode) {
			var self = this;
			var result = [];
			var argNodes = funcNode[1].toArray();
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