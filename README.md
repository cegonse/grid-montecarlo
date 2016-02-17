# Grid-Montecarlo

An application to do Montecarlo simulations using a Grid
infrastructure based on the Globus toolkit. In the included
files, the simulation is used to estimate the value of Pi.

To access the Grid and interact with the Globus toolkit
functions, the library Globus is used, which is on the
globus.js file.

# Running

This application needs the following files to work:
- ./etc/base.rsl: RSL definition file with the structure
     that will be filled by the Globus library.
- ./etc/montecarlo.m: Octave script which will be executed
     by all the nodes in the Grid.
- ./etc/post.m: Octave script to post-process the result
     obtained on each node and get the final result.
- ./etc/rsl.json: JSON object containing the parameters to
     fill the RSL specifications.

Once the application finishes executing, the following files
will be created:
- Many files on ./tmp: all files inside this directory are
     workspace files and can be removed after the application
     has finished executing.
- ./res/result.dlm: DLM file containing the final post-processed
     result.

# Building
	 
The application needs the following external modules to run,
all of them are available through the npm packet manager:
- readline-sync
- async

Tested and developed under Node v4.1.0 on Debian x64.

# License

This application is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

It is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
//
You should have received a copy of the GNU General Public License
along with these files.  If not, see <http://www.gnu.org/licenses/>.