import { Inject, Injectable } from '@nestjs/common';
import { parsePhoto } from '../../domain/entities/photo.entity.js';
import { HaircutNotFoundError } from '../../domain/errors/haircut-not-found.error.js';
import { HAIRCUT_CATALOG_REPOSITORY } from '../../domain/ports/haircut-catalog.repository.js';
import type { HaircutCatalogRepository } from '../../domain/ports/haircut-catalog.repository.js';
import { HAIRSTYLE_EDITOR } from '../../domain/ports/hairstyle-editor.port.js';
import type { HairstyleEditor } from '../../domain/ports/hairstyle-editor.port.js';

/** Picture of the client wearing a cut of the catalog. Neither the photo nor the result is stored. */
@Injectable()
export class GenerateHaircutPreviewUseCase {
  constructor(
    @Inject(HAIRCUT_CATALOG_REPOSITORY)
    private readonly catalog: HaircutCatalogRepository,
    @Inject(HAIRSTYLE_EDITOR) private readonly editor: HairstyleEditor,
  ) {}

  async execute(input: {
    photo: string;
    haircutId: string;
  }): Promise<{ image: string }> {
    const photo = parsePhoto(input.photo);
    const haircut = (await this.catalog.findActive()).find(
      (h) => h.id === input.haircutId,
    );
    if (!haircut) {
      throw new HaircutNotFoundError(`Haircut ${input.haircutId} not found`);
    }
    const image = await this.editor.apply({ photo, haircut });
    return { image: `data:${image.mimeType};base64,${image.base64}` };
  }
}
