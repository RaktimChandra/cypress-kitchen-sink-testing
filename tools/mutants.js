/**
 * Mutation operators applied to the Kitchen Sink (fault injection into the SUT).
 * Each mutant is ONE small, realistic fault. `specs` lists the suites expected to
 * detect it (impact analysis), so each mutant is run only against relevant specs.
 * `equivalent: true` marks a mutant proven to have no observable effect.
 */
const S = 'assets/js/scripts.js'
const T = 'assets/js/todo/'
module.exports = [
  { id: 'M01', file: S, op: 'Statement deletion', find: "  $('.action-form').on('submit', (e) => {\n    e.preventDefault()", replace: "  $('.action-form').on('submit', (e) => {", desc: 'submit handler no longer prevents the page reload', specs: ['03-form-controls/submit'] },
  { id: 'M02', file: S, op: 'String literal', find: 'Your form has been submitted!', replace: 'Your form was submitted!', desc: 'confirmation text changed', specs: ['03-form-controls/submit'] },
  { id: 'M03', file: S, op: 'String literal', find: "$(e.currentTarget).addClass('focus')", replace: "$(e.currentTarget).addClass('focused')", desc: 'focus adds wrong class', specs: ['03-form-controls/text-inputs'] },
  { id: 'M04', file: S, op: 'String literal', find: "prev().css('color', 'orange')", replace: "prev().css('color', 'red')", desc: 'focus label colour wrong', specs: ['03-form-controls/text-inputs'] },
  { id: 'M05', file: S, op: 'String literal', find: "prev().css('color', 'red')", replace: "prev().css('color', 'orange')", desc: 'blur label colour wrong', specs: ['03-form-controls/text-inputs'] },
  { id: 'M06', file: S, op: 'Method call removal', find: "$('.action-input-hidden').removeClass('hidden').focus()", replace: "$('.action-input-hidden').removeClass('hidden')", desc: 'dblclick editor not focused', specs: ['03-form-controls/other-forms'] },
  { id: 'M07', file: S, op: 'Event swap', find: "$('.rightclick-action-div').on('contextmenu'", replace: "$('.rightclick-action-div').on('click'", desc: 'right-click editor opens on left click', specs: ['03-form-controls/other-forms'] },
  { id: 'M08', file: S, op: 'Arithmetic insertion', find: '$range.next(\'p\').text($range.val())', replace: '$range.next(\'p\').text(Number($range.val()) + 1)', desc: 'range echo off by one', specs: ['03-form-controls/range-bva'] },
  { id: 'M09', file: S, op: 'Constant change', find: 'context.arc(posx, posy, 5, 0, 2 * Math.PI)', replace: 'context.arc(posx, posy, 0, 0, 2 * Math.PI)', desc: 'canvas dot radius 0 (nothing drawn)', specs: ['04-ui-interactions/click'] },
  { id: 'M10', file: S, op: 'Variable swap', find: 'x: evt.clientX - rect.left,', replace: 'x: evt.clientX - rect.top,', desc: 'canvas x coordinate uses top offset', specs: ['04-ui-interactions/click'] },
  { id: 'M11', file: S, op: 'Property swap', find: "$('.network-comment').text(data.body)", replace: "$('.network-comment').text(data.name)", desc: 'comment shows name instead of body', specs: ['08-network/network'] },
  { id: 'M12', file: S, op: 'String literal', find: "text('POST successful!')", replace: "text('POST successfull!')", desc: 'typo in success message', specs: ['08-network/network'] },
  { id: 'M13', file: S, op: 'Constant change', find: '        404 (data) {', replace: '        500 (data) {', desc: '404 handler bound to 500', specs: ['08-network/network'] },
  { id: 'M14', file: S, op: 'Statement deletion', find: "    localStorage.setItem('prop3', 'magenta')\n", replace: '', desc: 'one storage key not written', specs: ['09-storage-cookies-window/storage-cookies'] },
  { id: 'M15', file: S, op: 'String literal', find: "document.cookie = 'token=123ABC'", replace: "document.cookie = 'token=123ABD'", desc: 'wrong cookie value', specs: ['09-storage-cookies-window/storage-cookies'] },
  { id: 'M16', file: S, op: 'String literal', find: "$li.addClass('active')", replace: "$li.addClass('selected')", desc: 'utilities item gets wrong class', specs: ['04-ui-interactions/page-widgets'] },
  { id: 'M17', file: S, op: 'Arithmetic change', find: "$div.text(new Date().getTime() / 1000)\n  })\n\n  $('#tick-div')", replace: "$div.text(new Date().getTime() / 100)\n  })\n\n  $('#tick-div')", desc: 'clock shows wrong unit', specs: ['10-spies-stubs-clocks/spies-stubs-clocks'] },
  { id: 'M18', file: S, op: 'String literal', find: ".addClass('btn-success').text('Changed')", replace: ".addClass('btn-success').text('Change')", desc: 'table button label unchanged', specs: ['04-ui-interactions/page-widgets'] },
  { id: 'M19', file: `${T}template.js`, op: 'Relational operator', find: "let plural = activeTodos === 1 ? '' : 's'", replace: "let plural = activeTodos > 1 ? 's' : ''", desc: 'pluralisation wrong at 0 ("0 item left")', specs: ['07-todo-app/todo-ecp-bva'] },
  { id: 'M20', file: `${T}template.js`, op: 'Relational operator', find: "let plural = activeTodos === 1 ? '' : 's'", replace: "let plural = activeTodos <= 1 ? '' : 's'", desc: 'pluralisation wrong at 0 (boundary shift)', specs: ['07-todo-app/todo-ecp-bva'] },
  { id: 'M21', file: `${T}controller.js`, op: 'Method call removal', find: "    if (title.trim() === '') {\n      return\n    }\n\n    self.model.create", replace: "    if (title === '') {\n      return\n    }\n\n    self.model.create", desc: 'whitespace-only titles accepted', specs: ['07-todo-app/todo-ecp-bva'] },
  { id: 'M22', file: `${T}model.js`, op: 'Method call removal', find: 'title: title.trim(),', replace: 'title: title,', desc: 'titles not trimmed on create', specs: ['07-todo-app/todo-ecp-bva'] },
  { id: 'M23', file: `${T}controller.js`, op: 'Statement deletion', find: '    } else {\n      self.removeItem(id)\n    }', replace: '    }', desc: 'empty edit no longer deletes the item', specs: ['07-todo-app/todo-cause-effect'] },
  { id: 'M24', file: `${T}view.js`, op: 'Constant change', find: 'this.ESCAPE_KEY = 27', replace: 'this.ESCAPE_KEY = 28', desc: 'Escape no longer cancels an edit', specs: ['07-todo-app/todo-cause-effect'] },
  { id: 'M25', file: `${T}template.js`, op: 'Function call removal (security)', find: "template.replace('{{title}}', escape(data[i].title))", replace: "template.replace('{{title}}', data[i].title)", desc: 'HTML escaping removed → stored XSS', specs: ['15-security/xss-and-headers'] },
  { id: 'M26', file: `${T}controller.js`, op: 'Boolean literal', find: "self.model.read({ completed: true }, function (data) {\n      self.view.render('showEntries', data)", replace: "self.model.read({ completed: false }, function (data) {\n      self.view.render('showEntries', data)", desc: 'Completed filter shows active items', specs: ['07-todo-app/todo-functional'] },
  { id: 'M27', file: `${T}controller.js`, op: 'Relational operator', find: 'visible: todos.completed > 0,', replace: 'visible: todos.completed >= 0,', desc: 'Clear completed always visible', specs: ['07-todo-app/todo-decision-table'] },
  { id: 'M28', file: `${T}controller.js`, op: 'Relational operator', find: "self.view.render('toggleAll', { checked: todos.completed === todos.total })", replace: "self.view.render('toggleAll', { checked: todos.completed > 0 })", desc: 'toggle-all checked when any (not all) completed', specs: ['07-todo-app/todo-decision-table'] },
  { id: 'M29', file: `${T}store.js`, op: 'Statement deletion', find: "      todos.push(updateData)\n      localStorage.setItem(this._dbName, JSON.stringify(todos))", replace: '      todos.push(updateData)', desc: 'new todos not persisted', specs: ['07-todo-app/todo-persistence'] },
  { id: 'M30', file: 'commands/actions.html', op: 'Attribute change (HTML)', find: '<input type="email" class="form-control action-email"', replace: '<input type="text" class="form-control action-email"', desc: 'email field loses type=email validation', specs: ['03-form-controls/email-validation'] },
  { id: 'M31', file: 'commands/actions.html', op: 'Attribute deletion (HTML)', find: '<input type="radio" name="optionsRadios" id="optionsRadios3" value="radio3" disabled>', replace: '<input type="radio" name="optionsRadios" id="optionsRadios3" value="radio3">', desc: 'disabled radio becomes selectable', specs: ['03-form-controls/checkboxes-radios'] },
  { id: 'M32', file: `${T}template.js`, op: 'Declaration change', find: "let plural = activeTodos === 1 ? '' : 's'", replace: "const plural = activeTodos === 1 ? '' : 's'", desc: 'let → const (no observable difference)', specs: ['07-todo-app/todo-ecp-bva'], equivalent: true },
]
