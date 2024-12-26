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
	git clean -xdf && docker build -t rakd/hummingbot-gateway${TAG} -f Dockerfile .
	docker tag 	rakd/hummingbot-gateway${TAG} ghcr.io/rakd/hummingbot-gateway${TAG}

dockerpush: docker
	docker push rakd/hummingbot-gateway${TAG}

dockerpush2: docker 

	echo $CR_PAT | docker login ghcr.io -u $GUSERNAME --password-stdin
	docker push ghcr.io/rakd/hummingbot-gateway${TAG}