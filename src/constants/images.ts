import { ImageSourcePropType } from 'react-native';

// Timeline event images — mapped by filename for use in study sections and timeline
export const TIMELINE_IMAGES: Record<string, ImageSourcePropType> = {
  '1 ROMAN BRITAIN.png': require('@/assets/images/timeline/1 ROMAN BRITAIN.png'),
  '2 ANGLO-SAXON BRITAIN.png': require('@/assets/images/timeline/2 ANGLO-SAXON BRITAIN.png'),
  '3 VIKING AGE.png': require('@/assets/images/timeline/3 VIKING AGE.png'),
  '4 NORMAN BRITAIN.png': require('@/assets/images/timeline/4 NORMAN BRITAIN.png'),
  '5 MEIEVAL ENGLAND.png': require('@/assets/images/timeline/5 MEIEVAL ENGLAND.png'),
  '6 TUDOR ENGLAND.png': require('@/assets/images/timeline/6 TUDOR ENGLAND.png'),
  '7 STUART BRITAIN.png': require('@/assets/images/timeline/7 STUART BRITAIN.png'),
  '8 INDUSTRIAL BRITAIN.png': require('@/assets/images/timeline/8 INDUSTRIAL BRITAIN.png'),
  '9 WORLD WAR BRITAIN.png': require('@/assets/images/timeline/9 WORLD WAR BRITAIN.png'),
  '10 MODERN BRITAIN.png': require('@/assets/images/timeline/10 MODERN BRITAIN.png'),
  '11 ROMAN INVASION.png': require('@/assets/images/timeline/11 ROMAN INVASION.png'),
  '12 VIKINGS RAID LINISDARNE.png': require('@/assets/images/timeline/12 VIKINGS RAID LINISDARNE.png'),
  '13 BATTLE OF HASTINGS.png': require('@/assets/images/timeline/13 BATTLE OF HASTINGS.png'),
  '14 DOMESDAY BOOK.png': require('@/assets/images/timeline/14 DOMESDAY BOOK.png'),
  '15 MAGNA CARTA.png': require('@/assets/images/timeline/15 MAGNA CARTA.png'),
  '16 BLACK DEATH.png': require('@/assets/images/timeline/16 BLACK DEATH.png'),
  '17 WAR OF ROSES.png': require('@/assets/images/timeline/17 WAR OF ROSES.png'),
  '18 CHURCH OF ENGLAND.png': require('@/assets/images/timeline/18 CHURCH OF ENGLAND.png'),
  '19 SPANISH ARMADA.png': require('@/assets/images/timeline/19 SPANISH ARMADA.png'),
  '20 GUNPOWDER PLOT.png': require('@/assets/images/timeline/20 GUNPOWDER PLOT.png'),
  '21 ENGLISH CIVIL WAR.png': require('@/assets/images/timeline/21 ENGLISH CIVIL WAR.png'),
  '22 EXECUTION OF CHARLES I.png': require('@/assets/images/timeline/22 EXECUTION OF CHARLES I.png'),
  '23 GREAT FIRE OF LONDON.png': require('@/assets/images/timeline/23 GREAT FIRE OF LONDON.png'),
  '24 INDUSTRIAL REVOLUTION.png': require('@/assets/images/timeline/24 INDUSTRIAL REVOLUTION.png'),
};

// Dynasty shield images
export const DYNASTY_IMAGES: Record<string, ImageSourcePropType> = {
  'dynasty-normans.png': require('@/assets/images/timeline/dynasty-normans.png'),
  'dynasty-plantagenets.png': require('@/assets/images/timeline/dynasty-plantagenets.png'),
  'dynasty-lancaster.png': require('@/assets/images/timeline/dynasty-lancaster.png'),
  'dynasty-york.png': require('@/assets/images/timeline/dynasty-york.png'),
  'dynasty-tudors.png': require('@/assets/images/timeline/dynasty-tudors.png'),
  'dynasty-stuarts.png': require('@/assets/images/timeline/dynasty-stuarts.png'),
  'dynasty-hanoverians.png': require('@/assets/images/timeline/dynasty-hanoverians.png'),
  'dynasty-windsors.png': require('@/assets/images/timeline/dynasty-windsors.png'),
};

// Reference infographic images
export const REFERENCE_IMAGES: Record<string, ImageSourcePropType> = {
  'patron-saints.png': require('@/assets/images/timeline/patron-saints.png'),
  'henry-viii-wives.png': require('@/assets/images/timeline/henry-viii-wives.png'),
  'uk-countries-map.png': require('@/assets/images/timeline/uk-countries-map.png'),
};

// Combined image map for study sections (used in [topicId].tsx)
export const STUDY_IMAGES: Record<string, ImageSourcePropType> = {
  ...TIMELINE_IMAGES,
  ...DYNASTY_IMAGES,
  ...REFERENCE_IMAGES,
};
