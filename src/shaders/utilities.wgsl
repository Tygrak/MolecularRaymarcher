//rewritten from https://github.com/kbinani/colormap-shaders/tree/master/shaders/glsl to wgsl
fn hsv2rgb(h: f32, s: f32, v: f32) -> vec4<f32> {
	var r = v;
	var g = v;
	var b = v;
	if (s > 0.0) {
		let i = i32(h*6.0);
		let f = h*6.0 - f32(i);
		if (i == 1) {
            r *= 1.0 - s * f;
            b *= 1.0 - s;
		} else if (i == 2) {
			r *= 1.0 - s;
			b *= 1.0 - s * (1.0 - f);
		} else if (i == 3) {
			r *= 1.0 - s;
			g *= 1.0 - s * f;
		} else if (i == 4) {
			r *= 1.0 - s * (1.0 - f);
			g *= 1.0 - s;
		} else if (i == 5) {
			g *= 1.0 - s;
			b *= 1.0 - s * f;
		} else {
			g *= 1.0 - s * (1.0 - f);
			b *= 1.0 - s;
		}
	}
	return vec4(r, g, b, 1.0);
}

//IDL_Haze
fn colormap_haze_red(x: f32) -> f32 {
    if (x < 0.0) {
        return 167.0;
    } else if (x < (2.54491177159840E+02 + 2.49117061281287E+02) / (1.94999353031535E+00 + 1.94987400471999E+00)) {
        return -1.94987400471999E+00 * x + 2.54491177159840E+02;
    } else if (x <= 255.0) {
        return 1.94999353031535E+00 * x - 2.49117061281287E+02;
    } else {
        return 251.0;
    }
}

fn colormap_haze_green(x: f32) -> f32 {
    if (x < 0.0) {
        return 112.0;
    } else if (x < (2.13852573128775E+02 + 1.42633630462899E+02) / (1.31530121382008E+00 + 1.39181683887691E+00)) {
        return -1.39181683887691E+00 * x + 2.13852573128775E+02;
    } else if (x <= 255.0) {
        return 1.31530121382008E+00 * x - 1.42633630462899E+02;
    } else {
        return 195.0;
    }
}

fn colormap_haze_blue(x: f32) -> f32 {
    if (x < 0.0) {
        return 255.0;
    } else if (x <= 255.0) {
        return -9.84241021836929E-01 * x + 2.52502692064968E+02;
    } else {
        return 0.0;
    }
}

fn colormap_haze(x: f32) -> vec4<f32> {
    let t = x * 255.0;
    let r = colormap_haze_red(t) / 255.0;
    let g = colormap_haze_green(t) / 255.0;
    let b = colormap_haze_blue(t) / 255.0;
    return vec4(r, g, b, 1.0);
}

//transform_hot_metal modified for multiple colorbands
fn colormap_hotmetal_red(x: f32) -> f32 {
    if (x < 0.0) {
        return 0.0;
    } else if (x <= 0.57147) {
        return 446.22 * x / 255.0;
    } else {
       return 1.0;
    }
}

fn colormap_hotmetal_green(x: f32) -> f32 {
    if (x < 0.6) {
        return 0.0;
    } else if (x <= 0.95) {
        return ((x - 0.6) * 728.57) / 255.0;
    } else {
        return 1.0;
    }
}

fn colormap_hotmetal_blue(x: f32) -> f32 {
    if (x > 0) {
        return 0.05;
    } else if (x > 1) {
        return 0.4;
    } else if (x > 2) {
        return 0.8;
    } else if (x > 3) {
        return 1.0;
    }
    return 0.0;
}

fn colormap_hotmetal(x: f32) -> vec4<f32> {
    return vec4(colormap_hotmetal_red(x%1), colormap_hotmetal_green(x%1), colormap_hotmetal_blue(x), 1.0);
}

//IDL_Eos_B
fn colormap_eosb_h(x: f32) -> f32 {
	if (x < 0.1167535483837128) {
		return 2.0 / 3.0; // H1
	} else if (x < 0.1767823398113251) {
		return ((-3.19659402385354E+02 * x + 1.14469539590179E+02) * x - 1.52210982227697E+01) * x + 1.39214703883044E+00; // H2
	} else if (x < 0.2266354262828827) {
		return ((-3.55166097640991E+02 * x + 2.51218596935272E+02) * x - 6.08853752315044E+01) * x + 5.38727123476564E+00; // H3
	} else if (x < (6.95053970124612E-01 - 4.13725796136428E-01) / (1.48914458632691E+00 - 6.97458630656247E-01)) {
		return -1.48914458632691E+00 * x + 6.95053970124612E-01; // H4
	} else if (x < (4.13725796136428E-01 - 2.48329223043123E-01) / (6.97458630656247E-01 - 3.48617475202321E-01)) {
		return -6.97458630656247E-01 * x + 4.13725796136428E-01; // H5
	} else {
		return -3.48617475202321E-01 * x + 2.48329223043123E-01; // H6
	}
}

fn colormap_eosb_v(x: f32) -> f32 {
	var v = 1.0;
	if (x < 0.115834504365921) {
		v = 4.18575376272140E+00 * x + 5.15145240089963E-01; // V1-Hi
	} else if (x < (1.90980360972022E+00 + 9.13724751363001E-01) / (7.87450639585523E+00 + 7.87450803534638E+00)) {
		v = -7.87450803534638E+00 * x + 1.90980360972022E+00; // V2-Hi
	} else if (x < 0.5) {
		v = 7.87450639585523E+00 * x - 9.13724751363001E-01; // V3-Hi
	} else {
		v = -1.87540494049556E+00 * x + 2.33603077812338E+00; // V4-Hi
	}
	v = clamp(v, 0.0, 1.0);

	let period = 4.0 / 105.0;
	let len = 3.0 / 252.0;
	let t = (x + 7.0 / 252.0)%period;
	if (0.0 <= t && t < len) {
		if (x < 0.115834504365921) {
			v = 3.74113124408467E+00 * x + 4.64654322955584E-01; // V1-Lo
		} else if (x < (1.90980360972022E+00 + 9.13724751363001E-01) / (7.87450639585523E+00 + 7.87450803534638E+00)) {
			v = -3.97326878048783E+00 * x + 1.25308500609757E+00; // V2-Lo
		} else if (x < 0.25) {
			v = 6.99297032967038E+00 * x - 8.03946549450558E-01; // V3-Lo
		} else if (x < 0.72) {
			v -= 26.0 / 255.0;
		} else {
			v = -1.67870020621040E+00 * x + 2.09414636280895E+00; // V4-Lo
		}
	}

	return v;
}

fn colormap_eosb(x: f32) -> vec4<f32> {
	let h = colormap_eosb_h(clamp(x, 0.0, 1.0));
	let s = 1.0;
	let v = colormap_eosb_v(clamp(x, 0.0, 1.0));
	return hsv2rgb(h, s, v);
}
