# WGSL Preprocessor

Very simple preprocessing for wgsl created to help manage the large shader files used in the project.

The preprocessor never adds or deletes lines to make sure error reporting still works correctly and shows the correct line numbers.

## Example

Considering this code snippet. 

```
//exponential smooth min
//#if UseSmoothMinExp
/*
fn opSMin(d1: f32, d2: f32, k: f32) -> f32 {
    let res = exp2(-(2.0/k)*d1) + exp2(-(2.0/k)*d2);
    return -log2(res)/(2.0/k);
}
*/
//#endif UseSmoothMinExp

//polynomial smooth min 2
//#if UseSmoothMinPoly2
fn opSMin(d1: f32, d2: f32, k: f32) -> f32 {
    let h = max(k-abs(d1-d2), 0.0)/k;
    return min(d1, d2) - h*h*k*(1.0/4.0);
}
//#endif UseSmoothMinPoly2
```

This shader compiles even if the preprocessor doesn't run, to make sure the preprocessor isn't needed.

If using `UseSmoothMinExp` as a flag the resulting code would look like:

```
//exponential smooth min
//#if UseSmoothMinExp

fn opSMin(d1: f32, d2: f32, k: f32) -> f32 {
    let res = exp2(-(2.0/k)*d1) + exp2(-(2.0/k)*d2);
    return -log2(res)/(2.0/k);
}

//#endif UseSmoothMinExp

//polynomial smooth min 2
//#if UseSmoothMinPoly2
//fn opSMin(d1: f32, d2: f32, k: f32) -> f32 {
//    let h = max(k-abs(d1-d2), 0.0)/k;
//    return min(d1, d2) - h*h*k*(1.0/4.0);
//}
//#endif UseSmoothMinPoly2
```

If using `UseSmoothMinPoly2` as a flag the resulting code would look like:

```
//exponential smooth min
//#if UseSmoothMinExp
///*
//fn opSMin(d1: f32, d2: f32, k: f32) -> f32 {
//    let res = exp2(-(2.0/k)*d1) + exp2(-(2.0/k)*d2);
//    return -log2(res)/(2.0/k);
//}
//*/
//#endif UseSmoothMinExp

//polynomial smooth min 2
//#if UseSmoothMinPoly2
fn opSMin(d1: f32, d2: f32, k: f32) -> f32 {
    let h = max(k-abs(d1-d2), 0.0)/k;
    return min(d1, d2) - h*h*k*(1.0/4.0);
}
//#endif UseSmoothMinPoly2
```

## Available Commands

A variant that checks for the presence of a flag:

```
//#if FlagName
//#endif FlagName
```

A variant that checks that a flag is not present:

```
//#ifnot FlagName
//#endifnot FlagName
```
