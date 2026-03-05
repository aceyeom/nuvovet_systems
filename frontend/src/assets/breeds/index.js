import goldenRetriever from './golden_retriever.svg';
import sheltie from './sheltie.svg';
import frenchBulldog from './french_bulldog.svg';
import dachshund from './dachshund.svg';
import domesticSh from './domestic_sh.svg';
import persian from './persian.svg';
import siamese from './siamese.svg';

export const BREED_IMAGES = {
  golden_retriever: goldenRetriever,
  sheltie: sheltie,
  french_bulldog: frenchBulldog,
  dachshund: dachshund,
  domestic_sh: domesticSh,
  persian: persian,
  siamese: siamese,
};

export function getBreedImage(breedId) {
  return BREED_IMAGES[breedId] || null;
}
