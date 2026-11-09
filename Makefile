.PHONY: install test smoke demo coverage mutation catalogue charts deliverables lint
install:      ; npm ci
test:         ; npm test
smoke:        ; npm run test:smoke
demo:         ; npm run test:demo
coverage:     ; npm run test:coverage
mutation:     ; npm run mutation
lint:         ; npm run lint
catalogue:    ; node tools/catalogue.js
charts: catalogue ; cd tools/deliverables && python3 charts.py
deliverables: charts
	cd tools/deliverables && python3 build_workbook.py
	node tools/deliverables/build_report.js
	node tools/deliverables/build_deck.js
	node tools/deliverables/build_ft3_pack.js
