%
%  pathtrace.m
%  César González Segura, 2015-2016
%  <cegonse@posgrado.upv.es>, <cegonse@alumni.uv.es>
%
%  This function obtains the texel color value for the specified
%  view ray and scene graph.
%
%  Input arguments:
%  - m_eye (vec3): position in world-space coordinates of the camera.
%  - direction (vec3): direction of the view ray.
%  - scene (struct): scene graph.
%  - m_light (vec3): light direction vector.
%
%  Output value:
%  - rgb (vec3): texel color.
%
%  This script is free software: you can redistribute it and/or modify
%  it under the terms of the GNU General Public License as published by
%  the Free Software Foundation, either version 3 of the License, or
%  (at your option) any later version.
%
%  It is distributed in the hope that it will be useful,
%  but WITHOUT ANY WARRANTY; without even the implied warranty of
%  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
%  GNU General Public License for more details.
%
%  You should have received a copy of the GNU General Public License
%  along with these files.  If not, see <http://www.gnu.org/licenses/>.
%

function rgb = pathtrace(m_eye, direction, scene, m_light)
    rgb = zeros(1,3);
    
    % Find the nearest object in the scene
    % First, cycle through all the objects in the scene
    found = 0;
    ip = 1000000 * ones(length(scene), 3);
    
    for i = 1:length(scene)
        % Find the intersection between the view ray and the object
        points = intersectLineSphere([m_eye(1) m_eye(2) m_eye(3) direction(1) direction(2) direction(3)], 
                    [scene(i).center(1) scene(i).center(2) scene(i).center(3) scene(i).radius]);
        
        % If there is an intersection
        if ~isnan(points)
            ip(i,:) = points(2,:);
            found = 1;
        end
    end
    
    % Once all intersection points have been found,
    % use only the closest object
    
    if found == 1
        closest = 1;
            
        for i = 2:length(ip)
            if norm(ip(i,:) - m_eye) < norm(ip(closest,:) - m_eye)
                closest = i;
            end
        end
        
        % Get the normal vector at the intersection point
        normal = scene(closest).center - ip(closest,:);
        normal = normal / norm(normal);
        
        % Calculate the diffuse component of the light 
        cos_theta = dot(normal, m_light) * scene(closest).reflectance;
        
        % Clamp cos(th) to 0-1 range
        if cos_theta > 1
            cos_theta = 1;
        elseif cos_theta < 0
            cos_theta = 0;
        end
        
        rgb = scene(closest).emittance * cos_theta;
        
        % Clamp to RGB unit space
        if rgb > [1 1 1]
            rgb = [1 1 1];
        elseif rgb < [0 0 0]
            rgb = [0 0 0];
        end
    end
endfunction
