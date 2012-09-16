### What is AlgoView?
AlgoView is a tool for visualization of intermediate data of algorithm during it's execution.
It's inspired by the demo that Bret Victor has shown earlier this year on the CUSEC 2012 conference in the famous lecture "Inventing on Principle".
### For what language is AlgoView written for?
Currently my sample is implemented for JavaScript (on JavaScript as well).
### Can one use AlgoView as a component (to integrate it inside his/her projects)?
While it's still in the state of a prototype it's designed to be used as component (search for "new AlgoView" in the project and you will be able find what's the prerequisite for using it - currently only few html elements, which in the future will be generated on the fly).
### What dependencies does AlgoView carries?
AlgoView is implemented using CodeMirror code editor, TreeHugger.js, jQuery and "nameless" neat little module for inheritance by John Resig.
### What's currently NOT supported?
* Currently one can only write a single level function (also no other functions on the top level).
* For and ForIn loops are not yet supported.
* Multi-line parameters (right side, at the top is where you can fill the parameters that your function accepts) are not yet supported.
* Minified code is also not yet analyzable by AlgoView.
* Change in objects and arrays are not yet tracked.

### What is the plan?
While I am not sure how much I will be able to take this project, I am sure that I want all the listed above features and will work on implementing them.

### Demo?
Here is link to an [AlgoView demo](http://nicroto.github.com/AlgoView/).