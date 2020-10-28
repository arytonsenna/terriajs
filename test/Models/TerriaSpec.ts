import Terria from "../../lib/Models/Terria";
import CommonStrata from "../../lib/Models/CommonStrata";
import ViewState from "../../lib/ReactViewModels/ViewState";
import { buildShareLink } from "../../lib/ReactViews/Map/Panels/SharePanel/BuildShareLink";
import WebMapServiceCatalogItem from "../../lib/Models/WebMapServiceCatalogItem";
import WebMapServiceCatalogGroup from "../../lib/Models/WebMapServiceCatalogGroup";
import openGroup from "../../lib/Models/openGroup";
import { BaseModel } from "../../lib/Models/Model";
import { action, runInAction } from "mobx";
import ImagerySplitDirection from "terriajs-cesium/Source/Scene/ImagerySplitDirection";
import UrlReference, {
  UrlToCatalogMemberMapping
} from "../../lib/Models/UrlReference";
import SimpleCatalogItem from "../Helpers/SimpleCatalogItem";
import PickedFeatures from "../../lib/Map/PickedFeatures";
import Feature from "../../lib/Models/Feature";
import Cesium from "../../lib/Models/Cesium";
import CustomDataSource from "terriajs-cesium/Source/DataSources/CustomDataSource";
import Entity from "terriajs-cesium/Source/DataSources/Entity";
import hashEntity from "../../lib/Core/hashEntity";
import { isInitUrl, isInitData } from "../../lib/Models/InitSource";
import CameraView from "../../lib/Models/CameraView";
import MagdaReference from "../../lib/Models/MagdaReference";

const mapConfigBasicJson = require("../../wwwroot/test/Magda/map-config-basic.json");
const mapConfigBasicString = JSON.stringify(mapConfigBasicJson);

const mapConfigInlineInitJson = require("../../wwwroot/test/Magda/map-config-inline-init.json");
const mapConfigInlineInitString = JSON.stringify(mapConfigInlineInitJson);

const mapConfigDereferencedJson = require("../../wwwroot/test/Magda/map-config-dereferenced.json");
const mapConfigDereferencedString = JSON.stringify(mapConfigDereferencedJson);

describe("Terria", function() {
  let terria: Terria;

  beforeEach(function() {
    terria = new Terria({
      baseUrl: "./"
    });
  });

  describe("terria start", function() {
    beforeEach(function() {
      jasmine.Ajax.install();
      // Fail all requests by default.
      jasmine.Ajax.stubRequest(/.*/).andError({});

      jasmine.Ajax.stubRequest(/.*(serverconfig|proxyabledomains).*/).andReturn(
        {
          responseText: JSON.stringify({ foo: "bar" })
        }
      );

      // from `terria.start()`
      jasmine.Ajax.stubRequest("test/Magda/map-config-basic.json").andReturn({
        responseText: mapConfigBasicString
      });

      // terria's "Magda derived url"
      jasmine.Ajax.stubRequest(
        /.*api\/v0\/registry\/records\/map-config-basic.*/
      ).andReturn({ responseText: mapConfigBasicString });

      // inline init
      jasmine.Ajax.stubRequest(/.*map-config-inline-init.*/).andReturn({
        responseText: mapConfigInlineInitString
      });
      // inline init
      jasmine.Ajax.stubRequest(/.*map-config-dereferenced.*/).andReturn({
        responseText: mapConfigDereferencedString
      });

      terria = new Terria({
        baseUrl: "./"
      });
    });

    afterEach(function() {
      jasmine.Ajax.uninstall();
    });

    describe("via loadMagdaConfig", function() {
      it("should dereference uniqueId to `/`", function(done) {
        expect(terria.catalog.group.uniqueId).toEqual("/");

        jasmine.Ajax.stubRequest(/.*api\/v0\/registry.*/).andReturn({
          // terria's "Magda derived url"
          responseText: mapConfigBasicString
        });
        // no init sources before starting
        expect(terria.initSources.length).toEqual(0);

        terria
          .start({
            configUrl: "test/Magda/map-config-basic.json"
          })
          .then(function() {
            expect(terria.catalog.group.uniqueId).toEqual("/");
            done();
          })
          .catch(error => {
            done.fail(error);
          });
      });
      it("works with basic initializationUrls", function(done) {
        jasmine.Ajax.stubRequest(/.*api\/v0\/registry.*/).andReturn({
          // terria's "Magda derived url"
          responseText: mapConfigBasicString
        });
        // no init sources before starting
        expect(terria.initSources.length).toEqual(0);

        terria
          .start({
            configUrl: "test/Magda/map-config-basic.json"
          })
          .then(function() {
            expect(terria.initSources.length).toEqual(1);
            expect(isInitUrl(terria.initSources[0])).toEqual(true);
            if (isInitUrl(terria.initSources[0])) {
              expect(terria.initSources[0].initUrl).toEqual(
                mapConfigBasicJson.aspects["terria-config"]
                  .initializationUrls[0]
              );
            } else {
              throw "not init source";
            }
            done();
          })
          .catch(error => {
            done.fail(error);
          });
      });
      it("works with inline init", function(done) {
        // inline init
        jasmine.Ajax.stubRequest(/.*api\/v0\/registry.*/).andReturn({
          responseText: mapConfigInlineInitString
        });
        // no init sources before starting
        expect(terria.initSources.length).toEqual(0);
        terria
          .start({
            configUrl: "test/Magda/map-config-inline-init.json"
          })
          .then(function() {
            const inlineInit = mapConfigInlineInitJson.aspects["terria-init"];
            /** Check cors domains */
            expect(terria.corsProxy.corsDomains).toEqual(
              inlineInit.corsDomains
            );
            /** Camera setting */
            expect(terria.mainViewer.homeCamera).toEqual(
              CameraView.fromJson(inlineInit.homeCamera)
            );

            /** Ensure inlined data catalog from init sources */
            expect(terria.initSources.length).toEqual(1);
            if (isInitData(terria.initSources[0])) {
              expect(terria.initSources[0].data.catalog).toEqual(
                inlineInit.catalog
              );
            } else {
              throw "not init source";
            }
            done();
          })
          .catch(error => {
            done.fail(error);
          });
      });
      it("parses dereferenced group aspect", function(done) {
        expect(terria.catalog.group.uniqueId).toEqual("/");
        // dereferenced res
        jasmine.Ajax.stubRequest(/.*api\/v0\/registry.*/).andReturn({
          responseText: mapConfigDereferencedString
        });
        terria
          .start({
            configUrl: "test/Magda/map-config-dereferenced.json"
          })
          .then(function() {
            const groupAspect = mapConfigDereferencedJson.aspects["group"];
            const ids = groupAspect.members.map((member: any) => member.id);
            expect(terria.catalog.group.uniqueId).toEqual("/");
            // ensure user added data co-exists with dereferenced magda members
            expect(terria.catalog.group.members.length).toEqual(3);
            expect(terria.catalog.userAddedDataGroup).toBeDefined();
            ids.forEach((id: string) => {
              const model = terria.getModelById(MagdaReference, id);
              if (!model) {
                throw "no record id";
              }
              expect(terria.modelIds).toContain(id);
              expect(model.recordId).toEqual(id);
            });
            done();
          })
          .catch(error => {
            done.fail(error);
          });
      });
    });
  });
  describe("updateApplicationUrl", function() {
    let newTerria: Terria;
    let viewState: ViewState;

    beforeEach(function() {
      newTerria = new Terria({ baseUrl: "./" });
      viewState = new ViewState({
        terria: terria,
        catalogSearchProvider: null,
        locationSearchProviders: []
      });

      UrlToCatalogMemberMapping.register(
        s => true,
        WebMapServiceCatalogItem.type,
        true
      );

      terria.catalog.userAddedDataGroup.addMembersFromJson(CommonStrata.user, [
        {
          id: "itemABC",
          name: "abc",
          type: "wms",
          url: "test/WMS/single_metadata_url.xml"
        },
        {
          id: "groupABC",
          name: "xyz",
          type: "wms-group",
          url: "test/WMS/single_metadata_url.xml"
        }
      ]);

      terria.catalog.group.addMembersFromJson(CommonStrata.user, [
        {
          id: "itemDEF",
          name: "def",
          type: "wms",
          url: "test/WMS/single_metadata_url.xml"
        }
      ]);
    });

    it("initializes user added data group with shared items", function(done) {
      expect(newTerria.catalog.userAddedDataGroup.members).not.toContain(
        "itemABC"
      );
      expect(newTerria.catalog.userAddedDataGroup.members).not.toContain(
        "groupABC"
      );

      const shareLink = buildShareLink(terria, viewState);
      newTerria.updateApplicationUrl(shareLink).then(() => {
        expect(newTerria.catalog.userAddedDataGroup.members).toContain(
          "itemABC"
        );
        expect(newTerria.catalog.userAddedDataGroup.members).toContain(
          "groupABC"
        );

        done();
      });
    });

    it("initializes user added data group with shared UrlReference items", function(done) {
      terria.catalog.userAddedDataGroup.addMembersFromJson(CommonStrata.user, [
        {
          id: "url_test",
          name: "foo",
          type: "url-reference",
          url: "test/WMS/single_metadata_url.xml"
        }
      ]);

      const shareLink = buildShareLink(terria, viewState);
      newTerria.updateApplicationUrl(shareLink).then(() => {
        expect(newTerria.catalog.userAddedDataGroup.members).toContain(
          "url_test"
        );
        const urlRef = newTerria.getModelById(BaseModel, "url_test");
        expect(urlRef).toBeDefined();
        expect(urlRef instanceof UrlReference).toBe(true);

        if (urlRef instanceof UrlReference) {
          return urlRef.loadReference().then(() => {
            expect(urlRef.target).toBeDefined();
            done();
          });
        } else {
          done.fail();
        }
      });
    });

    it("initializes workbench with shared workbench items", function(done) {
      const model1 = <WebMapServiceCatalogItem>(
        terria.getModelById(BaseModel, "itemABC")
      );
      const model2 = <WebMapServiceCatalogItem>(
        terria.getModelById(BaseModel, "itemDEF")
      );
      terria.workbench.add(model1);
      terria.workbench.add(model2);
      expect(terria.workbench.itemIds).toContain("itemABC");
      expect(terria.workbench.itemIds).toContain("itemDEF");
      expect(newTerria.workbench.itemIds).toEqual([]);

      const shareLink = buildShareLink(terria, viewState);
      newTerria.updateApplicationUrl(shareLink).then(() => {
        expect(newTerria.workbench.itemIds).toEqual(terria.workbench.itemIds);
        done();
      });
    });

    it("initializes splitter correctly", function(done) {
      const model1 = <WebMapServiceCatalogItem>(
        terria.getModelById(BaseModel, "itemABC")
      );
      terria.workbench.add(model1);

      runInAction(() => {
        terria.showSplitter = true;
        terria.splitPosition = 0.7;
        model1.setTrait(
          CommonStrata.user,
          "splitDirection",
          ImagerySplitDirection.RIGHT
        );
      });

      const shareLink = buildShareLink(terria, viewState);
      newTerria.updateApplicationUrl(shareLink).then(() => {
        expect(newTerria.showSplitter).toEqual(true);
        expect(newTerria.splitPosition).toEqual(0.7);
        expect(newTerria.workbench.itemIds).toEqual(["itemABC"]);

        const newModel1 = <WebMapServiceCatalogItem>(
          newTerria.getModelById(BaseModel, "itemABC")
        );
        expect(newModel1).toBeDefined();
        expect(newModel1.splitDirection).toEqual(
          <any>ImagerySplitDirection.RIGHT
        );

        done();
      });
    });

    it("opens and loads members of shared open groups", function(done) {
      const group = <WebMapServiceCatalogGroup>(
        terria.getModelById(BaseModel, "groupABC")
      );
      openGroup(group)
        .then(() => {
          expect(group.isOpen).toBe(true);
          expect(group.members.length).toBeGreaterThan(0);
          return buildShareLink(terria, viewState);
        })
        .then(shareLink => newTerria.updateApplicationUrl(shareLink))
        .then(() => {
          const newGroup = <WebMapServiceCatalogGroup>(
            newTerria.getModelById(BaseModel, "groupABC")
          );
          expect(newGroup.isOpen).toBe(true);
          expect(newGroup.members).toEqual(group.members);
          done();
        });
    });
  });

  describe("proxyConfiguration", function() {
    beforeEach(function() {
      jasmine.Ajax.install();
      jasmine.Ajax.stubRequest(/.*(test\/init\/configProxy).*/).andReturn({
        responseText: JSON.stringify(
          require("../../wwwroot/test/init/configProxy.json")
        )
      });
      jasmine.Ajax.stubRequest(/.*(serverconfig).*/).andReturn({
        responseText: JSON.stringify(
          require("../../wwwroot/test/init/serverconfig.json")
        )
      });
    });

    afterEach(function() {
      jasmine.Ajax.uninstall();
    });

    it("initializes proxy with parameters from config file", function(done) {
      terria
        .start({
          configUrl: "test/init/configProxy.json"
        })
        .then(function() {
          expect(terria.corsProxy.baseProxyUrl).toBe("/myproxy/");
          expect(terria.corsProxy.proxyDomains).toEqual([
            "example.com",
            "csiro.au"
          ]);
          done();
        })
        .catch(error => {
          done.fail();
        });
    });
  });

  describe("removeModelReferences", function() {
    let model: SimpleCatalogItem;
    beforeEach(function() {
      model = new SimpleCatalogItem("testId", terria);
      terria.addModel(model);
    });

    it("removes the model from workbench", function() {
      terria.workbench.add(model);
      terria.removeModelReferences(model);
      expect(terria.workbench).not.toContain(model);
    });

    it("it removes picked features that contain the model", function() {
      terria.pickedFeatures = new PickedFeatures();
      const feature = new Feature({});
      feature._catalogItem = model;
      terria.pickedFeatures.features.push(feature);
      terria.removeModelReferences(model);
      expect(terria.pickedFeatures.features.length).toBe(0);
    });

    it("unregisters the model from Terria", function() {
      terria.removeModelReferences(model);
      expect(terria.getModelById(BaseModel, "testId")).toBeUndefined();
    });
  });

  //   it("tells us there's a time enabled WMS with `checkNowViewingForTimeWms()`", function(done) {
  //     terria
  //       .start({
  //         configUrl: "test/init/configProxy.json"
  //       })
  //       .then(function() {
  //         expect(terria.checkNowViewingForTimeWms()).toEqual(false);
  //       })
  //       .then(function() {
  //         const wmsItem = new WebMapServiceCatalogItem(terria);
  //         wmsItem.updateFromJson({
  //           url: "http://example.com",
  //           metadataUrl: "test/WMS/comma_sep_datetimes_inherited.xml",
  //           layers: "13_intervals",
  //           dataUrl: "" // to prevent a DescribeLayer request
  //         });
  //         wmsItem
  //           .load()
  //           .then(function() {
  //             terria.nowViewing.add(wmsItem);
  //             expect(terria.checkNowViewingForTimeWms()).toEqual(true);
  //           })
  //           .then(done)
  //           .otherwise(done.fail);
  //       })
  //       .otherwise(done.fail);
  //   });

  describe("applyInitData", function() {
    describe("when pickedFeatures is not present in initData", function() {
      it("unsets the feature picking state if `canUnsetFeaturePickingState` is `true`", function() {
        terria.pickedFeatures = new PickedFeatures();
        terria.selectedFeature = new Entity({ name: "selected" }) as Feature;
        terria.applyInitData({
          initData: {},
          canUnsetFeaturePickingState: true
        });
        expect(terria.pickedFeatures).toBeUndefined();
        expect(terria.selectedFeature).toBeUndefined();
      });

      it("otherwise, should not unset feature picking state", function() {
        terria.pickedFeatures = new PickedFeatures();
        terria.selectedFeature = new Entity({ name: "selected" }) as Feature;
        terria.applyInitData({
          initData: {}
        });
        expect(terria.pickedFeatures).toBeDefined();
        expect(terria.selectedFeature).toBeDefined();
      });
    });
  });

  describe("loadPickedFeatures", function() {
    beforeEach(async function() {
      // Attach cesium viewer and wait for it to be loaded
      const container = document.createElement("div");
      document.body.appendChild(container);
      terria.mainViewer.attach(container);
      return (terria.mainViewer as any)._cesiumPromise;
    });

    it("sets the pickCoords", async function() {
      expect(terria.currentViewer instanceof Cesium).toBeTruthy();
      await terria.loadPickedFeatures({
        pickCoords: {
          lat: 84.93,
          lng: 77.91,
          height: -5400810.41
        },
        providerCoords: {
          "https://foo": { x: 123, y: 456, level: 7 },
          "https://bar": { x: 42, y: 42, level: 4 }
        }
      });
      const pickPosition = terria.pickedFeatures?.pickPosition;
      expect(pickPosition).toBeDefined();
      if (pickPosition) {
        const { x, y, z } = pickPosition;
        expect(x.toFixed(2)).toBe("18483.85");
        expect(y.toFixed(2)).toBe("86292.94");
        expect(z.toFixed(2)).toBe("952035.13");
      }
    });

    it("sets the selectedFeature", async function() {
      const testItem = new SimpleCatalogItem("test", terria);
      const ds = new CustomDataSource("ds");
      const entity = new Entity({ name: "foo" });
      ds.entities.add(entity);
      testItem.mapItems = [ds];
      terria.workbench.add(testItem);
      // It is irrelevant what we pass as argument for `clock` param because
      // the current implementation of `hashEntity` is broken because as it
      // expects a `Clock` but actually uses it as a `JulianDate`
      const entityHash = hashEntity(entity, undefined);
      await terria.loadPickedFeatures({
        pickCoords: {
          lat: 84.93,
          lng: 77.91,
          height: -5400810.41
        },
        providerCoords: {
          "https://foo": { x: 123, y: 456, level: 7 },
          "https://bar": { x: 42, y: 42, level: 4 }
        },
        entities: [
          {
            hash: entityHash,
            name: "foo"
          }
        ],
        current: {
          hash: entityHash,
          name: "foo"
        }
      });
      expect(terria.selectedFeature).toBeDefined();
      expect(terria.selectedFeature?.name).toBe("foo");
    });
  });
});
