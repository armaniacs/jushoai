.DEFAULT_GOAL := help

.PHONY: help install dev build test typecheck check zip clean site site-serve site-check

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
