.ONESHELL:
.PHONY: test
.PHONY: docker
.PHONY: build
.PHONY: prettify
.PHONY: lint

test:
	yarn test:unit

lint:
	yarn run lint

prettify:
	yarn run prettier

build:
	yarn build

docker:
	git clean -xdf && docker build --platform linux/amd64 -t rakd/hummingbot-gateway${TAG} -f Dockerfile .

dockerpush:
	docker push rakd/hummingbot-gateway
