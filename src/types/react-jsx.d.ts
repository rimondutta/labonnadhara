/// <reference types="react" />
/// <reference types="react/jsx-runtime" />
/// <reference types="react-dom" />

import type * as React from "react";

declare global {
  namespace JSX {
    type Element = React.ReactNode;
    type ElementType = React.JSX.ElementType;
    type ElementClass = React.JSX.ElementClass;
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
    type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>;
    type IntrinsicElements = React.JSX.IntrinsicElements;
  }
}

export {};
