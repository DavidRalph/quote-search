# quote-search
TensorflowJS powered quote search

## Setup
The build command will pre-generate the required Universal Sentence Encoder embeddings for the dataset.
```
npm i
npm run build
```
To use locally, simply open public/index.html in any web browser supported by TensorflowJS.

Alternatively, once built the files can be hosted as a static site. On their first visit, it may take clients a while to load the 150MB dataset with embeddings.
