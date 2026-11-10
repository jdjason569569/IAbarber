import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
} from '@angular/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption, EChartsType } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

// Only the pieces the app uses are bundled (tree-shaking): bars with an optional average line.
echarts.use([BarChart, GridComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);

/**
 * Draws an Apache ECharts chart from an option object and keeps it in sync: redraws when the option
 * changes and resizes with its container. The option is built by the feature that owns the data.
 */
@Component({
  selector: 'app-chart',
  template: '',
  styles: ':host { display: block; width: 100%; }',
  host: { role: 'img', '[attr.aria-label]': 'label()', '[style.height.px]': 'height()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent {
  readonly option = input.required<EChartsCoreOption>();
  readonly height = input(240);
  /** Short description for screen readers (the chart is a canvas). */
  readonly label = input('');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private chart: EChartsType | null = null;

  constructor() {
    afterNextRender(() => {
      this.chart = echarts.init(this.host.nativeElement, null, { renderer: 'canvas' });
      this.chart.setOption(this.option());
      const resize = new ResizeObserver(() => this.chart?.resize());
      resize.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => {
        resize.disconnect();
        this.chart?.dispose();
        this.chart = null;
      });
    });
    effect(() => {
      const option = this.option();
      this.chart?.setOption(option, { notMerge: true });
    });
  }
}
