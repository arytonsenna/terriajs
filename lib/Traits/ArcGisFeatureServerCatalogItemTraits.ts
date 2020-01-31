import mixTraits from "./mixTraits";
import UrlTraits from "./UrlTraits";
import CatalogMemberTraits from "./CatalogMemberTraits";
import MappableTraits from "./MappableTraits";
import primitiveTrait from "./primitiveTrait";
import objectArrayTrait from "./objectArrayTrait";
import LegendTraits from "./LegendTraits";

export default class ArcGisFeatureServerCatalogItemTraits extends mixTraits(
  UrlTraits,
  MappableTraits,
  CatalogMemberTraits
) {
  @primitiveTrait({
    type: "boolean",
    name: "Clamp to Ground",
    description:
      "Whether the features in this service should be clamped to the terrain surface."
  })
  clampToGround: boolean = false;

  @primitiveTrait({
    type: "boolean",
    name: "Use style information from service",
    description:
      "Whether to symbolise the data using the drawingInfo object available in the service endpoint."
  })
  useStyleInformationFromService: boolean = true;

  @primitiveTrait({
    type: "string",
    name: "layerDef",
    description:
      "The 'layerDef' string to pass to the server when requesting geometry."
  })
  layerDef: string = "1=1";

  @objectArrayTrait({
    name: "Legend URLs",
    description: "The legends to display on the workbench.",
    type: LegendTraits,
    idProperty: "index"
  })
  legends?: LegendTraits[];
}
