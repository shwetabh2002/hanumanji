import { Embeddable, Property } from '@mikro-orm/mongodb';

import { Lang } from '../enums/app.enum';

@Embeddable()
export class LanguageVariantProperty {
  @Property()
  [Lang.EN]!: string;

  @Property()
  [Lang.HIN]!: string;
}

@Embeddable()
export class LanguageVariantProperties {
  @Property()
  [Lang.EN]!: string[];
  @Property()
  [Lang.HIN]!: string[];
}
