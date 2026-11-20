# N3D-CE

**Neural 3D Scene Reconstruction for Clinical Environments**

[Open the research notebook](https://San9878.github.io/Research/N3D-CE/)

Quarto notebook about C3VD and SCARED reconstruction with VGGT / VGG-T³. Includes 44 experiment records, quantitative comparisons and interactive viewers. Original-paper results retain their dataset and evaluation context; they are methodological references, not direct cross-dataset rankings.

The web edition contains 15 complete primary point clouds in 15 packages (about 878.9 MiB compressed). Every saved vertex in those exports is retained. Historical exports outside this selection, raw datasets, model checkpoints, environments and private working archives are not part of this repository.

## Update from the original notebook on this PC

Edit `G:\Kaust\Bitacora\Bitacora.qmd`, then run in PowerShell:

```powershell
& 'G:\Kaust\Bitacora\Publicar.ps1'
```

The launcher exports the current notebook and its public resources, renders Quarto, checks links and size limits, then commits and pushes only changes under `N3D-CE`. GitHub Actions renders and deploys the site after a successful push. Credentials are handled by Git and are not included in this project.

To prepare and validate without pushing:

```powershell
& 'G:\Kaust\Bitacora\Publicar.ps1' -SoloPreparar
```

## Build on another machine

Requires Python 3 and Quarto 1.11.9. Point clouds are already stored; no ML inference is executed.

```sh
quarto render N3D-CE/Bitacora.qmd --to html
python N3D-CE/tools/build_site.py --root .
python -m http.server 8000 --directory _site
```

Open `http://localhost:8000/N3D-CE/`. The point-cloud viewer requires a browser with WebGL2 and gzip decompression support. Models load on request; use **Liberar 3D** to release the loaded geometry. The Pages URL also works when the author's PC is off.

`publication_manifest.json` records the exported notebook checksum, the selected cloud hashes and exact point counts. The export does not retrain models or recompute scientific metrics.

## Editorial review

[Review report and modularization proposal](contenido/revision_editorial_20261120/Informe_revision_editorial.html). The original scientific tables and cloud hashes are retained; no source modularization was performed.
