.DEFAULT_GOAL := help

.PHONY: help install dev build test typecheck check zip clean site site-serve addurl

help: ## Show available targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

install: ## Install dependencies and generate WXT types
	npm install

dev: ## Start the dev build with hot reload (launches Chrome)
	npm run dev

build: ## Build the extension into dist/chrome-mv3
	npm run build

test: ## Run the Vitest suite
	npm test

typecheck: ## Run tsc --noEmit (extension and site)
	npx wxt prepare
	npm run typecheck
	npx tsc -p site/tsconfig.json

check: typecheck test build ## Typecheck, test, then build

zip: ## Package the extension into dist/*.zip
	npx wxt zip

clean: ## Remove build output and generated WXT files
	rm -rf dist .wxt .vitest site-dist

site: ## Build and check the documentation site into site-dist (SITE_BASE sets the base path)
	npm run site

site-serve: site ## Serve site-dist at http://127.0.0.1:4173
	node site/serve.ts

addurl: ## Register URL in tests/target-url.md and sync fixtures (URL=... [FIXTURE=...])
ifndef URL
	$(error Usage: make addurl URL=https://example.com/form [FIXTURE=name.html])
endif
	@grep -qF -- "$(URL)" tests/target-url.md || printf -- '- %s%s\n' "$(URL)" "$(if $(FIXTURE), → $(FIXTURE))" >> tests/target-url.md
	node scripts/sync-target-urls.mjs
