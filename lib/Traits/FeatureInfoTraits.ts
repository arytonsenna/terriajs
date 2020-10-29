import ModelTraits from "./ModelTraits";
import objectTrait from "./objectTrait";
import primitiveTrait from "./primitiveTrait";
import anyTrait from "./anyTrait";

export class FeatureInfoTemplateTraits extends ModelTraits {
  @primitiveTrait({
    type: "string",
    name: "Name template",
    description: "A mustache template string for formatting name"
  })
  name?: string;

  @primitiveTrait({
    type: "string",
    name: "Template",
    description: "A Mustache template string for formatting description",
    isNullable: false
  })
  template?: string;

  @anyTrait({
    name: "Partials",
    description:
      "An object, mapping partial names to a template string. Defines the partials used in Template."
  })
  partials?: { [partial_name: string]: string };
}

export default class FeatureInfoTraits extends ModelTraits {
  @objectTrait({
    type: FeatureInfoTemplateTraits,
    name: "Feature info template",
    description:
      "A template object for formatting content in feature info panel"
  })
  featureInfoTemplate?: FeatureInfoTemplateTraits;

  @primitiveTrait({
    type: "string",
    name: "Feature Info Url template",
    description:
      "A template URL string for fetching feature info. Template values of the form {x} will be replaced with corresponding property values from the picked feature."
  })
  featureInfoUrlTemplate?: string;

  @primitiveTrait({
    type: "string",
    name: "Show string if property value is null",
    description:
      "If the value of a property is null or undefined, show the specified string as the value of the property. Otherwise, the property name will not be listed at all."
  })
  showStringIfPropertyValueIsNull?: string;
}
