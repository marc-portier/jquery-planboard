VERSION=1.0.0
DATE=$(shell date +%Y-%m-%d)
SRC=./src/main
BUILD=./build
DIST=./dist/${VERSION}
NAME = jquery-planboard
LESS_COMPRESSOR ?= `which lessc`
UGLIFY_JS ?= `which uglifyjs`
WATCHR ?= `which watchr`

build: css js

css:
	@@if test ! -z ${LESS_COMPRESSOR}; then \
		mkdir -p ${BUILD}; \
		sed -e 's/@VERSION/'"v${VERSION}"'/' -e 's/@DATE/'"${DATE}"'/' <${SRC}/css/${NAME}.less >${BUILD}/${NAME}.less; \
		lessc ${BUILD}/${NAME}.less > ${BUILD}/${NAME}.css; \
		lessc ${BUILD}/${NAME}.less > ${BUILD}/${NAME}.min.css --compress; \
		echo "css compile and compress sucessful! - `date`"; \
	else \
		echo "You must have the LESS compiler installed in order to compile and compress jQuery-planboard's css."; \
		echo "You can install it by running: npm install less -g"; \
	fi

js:
	@@if test ! -z ${UGLIFY_JS}; then \
		mkdir -p ${BUILD}; \
		sed -e 's/@VERSION/'"v${VERSION}"'/' -e 's/@DATE/'"${DATE}"'/' <${SRC}/js/${NAME}.js >${BUILD}/${NAME}.js; \
		uglifyjs -o ${BUILD}/${NAME}.min.js    ${BUILD}/${NAME}.js;\
		echo "js compress and uglify sucessful! - `date`"; \
	else \
		echo "You must have the UGLIFYJS minifier installed in order to minify jQuery-planboard's js."; \
		echo "You can install it by running: npm install uglify-js -g"; \
	fi

makedist:
	@@if test -d ${BUILD}; then \
	    mkdir -p ${DIST}; \
        cp ${BUILD}/${NAME}.js      ${DIST}/${NAME}-${VERSION}.js; \
        cp ${BUILD}/${NAME}.less    ${DIST}/${NAME}-${VERSION}.less; \
        cp ${BUILD}/${NAME}.min.js  ${DIST}/${NAME}-${VERSION}.min.js; \
        cp ${BUILD}/${NAME}.css     ${DIST}/${NAME}-${VERSION}.css; \
        cp ${BUILD}/${NAME}.min.css ${DIST}/${NAME}-${VERSION}.min.css; \
        echo "success building distro for version ${VERSION} - `date`"; \
        echo "now test then add, commit, tag and push through git to publish"; \
	else \
		echo "No build is available. Run 'make' or explicitely 'make build' first."; \
	fi

dist: build makedist

watch:
	@@if test ! -z ${WATCHR}; then \
	  echo "Watching files in src/main"; \
	  watchr -e "watch('src/main/.*/.*') { system 'make' }"; \
	else \
		echo "You must have the watchr installed in order to watch jQuery-planboard files."; \
		echo "You can install it by running: gem install watchr"; \
	fi

clean:
	rm -rf ${BUILD}

.PHONY: build watch
