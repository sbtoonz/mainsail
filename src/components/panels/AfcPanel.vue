<template>
  <div class="afc-panel-wrapper">
    <panel
      :icon="mdiAdjust"
      :title="'AFC Spools'"
      card-class="afc-panel"
      :collapsible="true"
      :expanded="true"
    >
        <template #buttons>
            <v-btn icon tile :title="'Refresh AFC Spools'" @click="fetchSpoolData">
                <v-icon>{{ mdiRefresh }}</v-icon>
            </v-btn>
            <v-menu :offset-y="true" :close-on-content-click="true" left>
                <template v-slot:activator="{ on, attrs }">
                    <v-btn icon tile v-bind="attrs" v-on="on">
                        <v-icon>{{ mdiDotsVertical }}</v-icon>
                    </v-btn>
                </template>
                <v-list>
                    <v-list-item>
                        <v-radio-group v-model="selectedStyle">
                            <v-radio label="Style 1" :value="1" @change="spitthing(1)"></v-radio>
                            <v-radio label="Style 2" :value="0" @change="spitthing(0)"></v-radio>
                        </v-radio-group>
                    </v-list-item>
                </v-list>
            </v-menu>
        </template>
      <div class="status-wrapper">
        <span class="tool-status">
          <strong>Tool Status:</strong>
          <span
            :class="{
              'status-light': true,
              'status-green': toolStartSensorStatus,
              'status-red': !toolStartSensorStatus,
            }"
          ></span>
        </span>
        <span class="buffer-status">
          <span v-if="systemData?.extruders?.extruder?.buffer_status">
            {{ bufferStatus() }}
          </span>
        </span>
      </div>
        <!-- Here i  add some kind of v-if lane count < X dont fold out else use panels-->
      <div
        v-for="(unit, unitName) in unitsData"
        :key="unitName"
        class="unit-section"
      >
        <div
          class="unit-header"
          style="display: flex; align-items: center; gap: 10px"
        >
          <h2 class="unit-title" style="margin: 0">
            {{ String(unitName).replace(/_/g, " ") }}
          </h2>
          <span class="hub-status">
            <span><strong>Hub Status:</strong></span>
            <span
              :class="{
                'status-light': true,
                'status-green': getHubStatus({unitName : unitName}),
                'status-red': !getHubStatus({unitName : unitName}),
              }"
            ></span>
          </span>
        </div>
        <div class="spool-container" style="margin-top: 15px">
          <div
            v-for="(spool, index) in unit.spools"
            :key="index"
            class="spool-card"
            @click="openChangeSpoolDialog(spool)"
          >
              <div class="filament-reel" style="padding: 1rem">
                  <spool-icon
                      v-if="styleIndex == 0"
                      :color="spool.color"
                      style="width: 35%; float: left"
                      class="mr-3"
                  />
                  <FilamentReelIcon
                      v-else
                      :color="spool.color"
                      style="width: 35%; float: left" class="mr-3"/>
              </div>
            <div class="spool-header">
              <span
                :class="{
                  'status-light': true,
                  'status-not-ready': determineStatus(spool) === 'Not Ready',
                  'status-ready': determineStatus(spool) === 'Ready',
                  'status-in-tool': determineStatus(spool) === 'In Tool',
                }"
              >
              </span>
              <h3>{{ spool.laneName }}</h3>
            </div>
            <p v-if="spool.material">{{ spool.material }}</p>
            <p v-if="spool.weight">{{ spoolWeight(spool) }}</p>
          </div>
        </div>
      </div>
    </panel>
    <afc-change-spool-dialog
      :show-dialog="showChangeSpoolDialog"
      :index="index"
      :lane-data="selectedLane"
      @close="showChangeSpoolDialog = false"
      @fetch-spool="fetchSpoolData"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import BaseMixin from "@/components/mixins/base";
import Panel from "@/components/ui/Panel.vue";
import { mdiAdjust, mdiRefresh, mdiDotsVertical } from "@mdi/js";
import AfcChangeSpoolDialog from "@/components/dialogs/AfcChangeSpoolDialog.vue";
import FilamentReelIcon from '@/components/ui/FilamentReelIcon.vue'
import SpoolIcon from "@/components/ui/SpoolIcon.vue";
import { AFCRoot } from '@/store/server/afc'

@Component({
  components: {
    Panel,
      AfcChangeSpoolDialog,
      SpoolIcon,
      FilamentReelIcon,
  },
})
export default class AfcPanel extends Mixins(BaseMixin) {
  mdiAdjust = mdiAdjust;
  mdiRefresh = mdiRefresh;
  mdiDotsVertical = mdiDotsVertical;

  showChangeSpoolDialog = false;
  selectedLane: any = null; // This will hold data of the clicked lane

  spoolData: any[] = [];
  intervalId: number | null = null;
  systemData: any = null;
  index: number = 0;
  unitsData: any = {};

  selectedStyle: number = 1;
  styleIndex: number = 1;

  async mounted() {
    this.fetchSpoolData();
    this.intervalId = setInterval(this.fetchSpoolData, 5);
  }

  beforeDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

    get afc_Data(): AFCRoot | null {
        return this.$store.state.printer.AFC
    }

  fetchSpoolData() {
      const afcData = this.afc_Data ? JSON.parse(JSON.stringify(this.afc_Data)) : null;

    if (afcData) {
      this.spoolData = this.extractLaneData(afcData);
      this.unitsData = this.groupByUnit(this.spoolData);
      this.systemData = afcData.system || {};
      for (const unitName in afcData) {
        if (afcData.hasOwnProperty(unitName) && unitName !== "system") {
          if (this.unitsData[unitName]) {
            this.unitsData[unitName].system = afcData[unitName].system || {};
          }
        }
      }
    } else {
      this.spoolData = [];
      this.unitsData = {};
      this.systemData = {};
    }
  }

  extractLaneData(spools: any) {
    const lanes = [];
    if (spools && typeof spools === "object") {
      for (const unitName in spools) {
        if (spools.hasOwnProperty(unitName) && unitName !== "system") {
          const unit = spools[unitName];
          for (const laneKey in unit) {
            if (
              unit.hasOwnProperty(laneKey) &&
              typeof unit[laneKey] === "object" &&
              laneKey !== "system"
            ) {
              const laneData = unit[laneKey];
              laneData.unitName = unitName;
              laneData.laneName = laneKey;
              lanes.push(laneData);
            }
          }
        }
      }
    }
    return lanes;
  }


  spitthing(changer: number){
      this.styleIndex = changer;
  }

  private groupByUnit(spoolData: any[]) {
    const units: any = {};
    spoolData.forEach((spool) => {
      const unitName = spool.unitName;
      if (!units[unitName]) {
        units[unitName] = { spools: [] };
      }
      units[unitName].spools.push(spool);
    });
    return units;
  }

  openChangeSpoolDialog(spool: any) {
    this.selectedLane = { spool, laneName: spool.laneName };
    this.showChangeSpoolDialog = true;
  }

  bufferStatus() {
    return this.systemData?.extruders?.extruder?.buffer_status || false;
  }

  getHubStatus({ unitName }: { unitName: any }) {
    if (this.unitsData[unitName]?.system?.hub_loaded !== undefined) {
      return this.unitsData[unitName].system.hub_loaded;
    }
    return this.systemData?.hub_loaded || false;
  }

  get toolStartSensorStatus() {
    return this.systemData?.extruders?.extruder?.tool_start_sensor || false;
  }

  spoolWeight(spool: any) {
    const weight = parseInt(spool.weight, 10);
    return weight ? `${weight} g` : "";
  }

  private determineStatus(spool: any) {
    if (spool.load && spool.prep) {
      if (this.systemData && this.systemData.current_load === spool.laneName) {
          if(spool.ID == this.$store.state.server.spoolman.active_spool?.id){
              spool.weight = this.$store.state.server.spoolman.active_spool?.remaining_weight;
          }
        return "In Tool";
      }
      return "Ready";
    }
    return "Not Ready";
  }
}
</script>

<style scoped>
.afc-panel-wrapper {
  margin-bottom: 24px;
}

.spool-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-evenly;
  gap: 8px;
  padding: 8px;
}

.unit-title {
  font-size: 1.5em;
  margin-bottom: 16px;
  text-align: left;
}

.spool-card {
  background-color: #2e2e2e;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  flex: 1 1 calc(23% - 16px);
  max-width: 140px;
  min-width: 80px;
  position: relative;
  cursor: hand;
  transition: box-shadow 0.3s;
  margin-bottom: 8px;
  text-align: right;
}

.filament-reel {
  position: absolute;
  bottom: -10px;
  left: -10px;
}

.spool-card p {
  margin: 4px 0;
}

.spool-header {
  display: flex;
  align-items: center;
  gap: 5px;
}

.status-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #ccc;
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.status-light {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  margin-left: 5px;
}

.status-green {
  background-color: rgb(24, 177, 24);
}

.status-red {
  background-color: red;
}

.hub-status {
  text-align: left;
  margin: 15px 0;
}

.tool-status {
  text-align: center;
  margin-left: 15px;
}

.status-not-ready {
  background-color: red;
}

.status-ready {
  background-color: rgb(26, 230, 26);
}

.status-in-tool {
  background-color: rgb(6, 197, 245);
}
</style>
